from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

from app.data.instruments import INSTRUMENTS, get_instrument
from app.engine.analysis import analyze, multi_timeframe, quote, screen
from app.engine.backtest import backtest

router = APIRouter()
TIMEFRAMES = {"15m", "1h", "4h", "1d"}


def _check(symbol: str, timeframe: str | None = None) -> str:
    if not get_instrument(symbol):
        raise HTTPException(404, f"Instrumen {symbol} tidak didukung")
    if timeframe and timeframe not in TIMEFRAMES:
        raise HTTPException(400, f"Timeframe harus salah satu dari {sorted(TIMEFRAMES)}")
    return symbol.upper()


@router.get("/instruments")
def list_instruments():
    return list(INSTRUMENTS.values())


@router.get("/instruments/{symbol}/history")
async def history(symbol: str, timeframe: str = Query("1h")):
    """Data OHLCV + indikator + level S/R + sinyal (satu paket, dipakai ChartPanel)."""
    sym = _check(symbol, timeframe)
    try:
        return await run_in_threadpool(analyze, sym, timeframe)
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.get("/instruments/{symbol}/signal")
async def signal(symbol: str, timeframe: str = Query("1h")):
    sym = _check(symbol, timeframe)
    res = await run_in_threadpool(analyze, sym, timeframe)
    return {"signal": res.signal, "levels": res.levels, "summary": res.summary}


@router.get("/instruments/{symbol}/mtf")
async def mtf(symbol: str):
    """Analisa multi-timeframe (15m/1h/4h/1d) + bias konfluensi (Fase 2)."""
    sym = _check(symbol)
    return await run_in_threadpool(multi_timeframe, sym)


@router.get("/instruments/{symbol}/backtest")
async def backtest_route(symbol: str, timeframe: str = Query("1h")):
    """Walk-forward backtest strategi sinyal atas data historis (Fase 2/3)."""
    sym = _check(symbol, timeframe)
    try:
        return await run_in_threadpool(backtest, sym, timeframe)
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.get("/screener")
async def screener(
    timeframe: str = Query("1h"),
    direction: str = Query("all", description="all|buy|sell|any (any = ada setup)"),
    asset_class: str = Query("all", description="all|forex|idx"),
    min_rr: float = Query(0.0),
    min_confidence: float = Query(0.0),
):
    """Screener seluruh instrumen dengan filter arah/kelas aset/RR/confidence (Fase 2)."""
    if timeframe not in TIMEFRAMES:
        raise HTTPException(400, f"Timeframe harus salah satu dari {sorted(TIMEFRAMES)}")
    rows = await run_in_threadpool(screen, timeframe)
    out = []
    for r in rows:
        if asset_class != "all" and r.instrument.asset_class != asset_class:
            continue
        if direction in ("buy", "sell") and r.direction != direction:
            continue
        if direction == "any" and r.direction == "none":
            continue
        if r.confidence < min_confidence:
            continue
        if min_rr and (r.risk_reward is None or r.risk_reward < min_rr):
            continue
        out.append(r)
    out.sort(key=lambda r: (r.direction == "none", -r.confidence))
    return out


@router.get("/quotes")
async def quotes(symbols: str = Query(..., description="Comma separated")):
    out = []
    for s in symbols.split(","):
        s = s.strip().upper()
        if get_instrument(s):
            try:
                out.append(await run_in_threadpool(quote, s))
            except RuntimeError:
                pass
    return out
