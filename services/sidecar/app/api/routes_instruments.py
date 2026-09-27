from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

from app.data.instruments import INSTRUMENTS, get_instrument
from app.engine.analysis import analyze, quote

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
