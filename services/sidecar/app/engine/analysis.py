"""Orkestrasi: data -> indikator -> S/R -> sinyal."""
from __future__ import annotations

import math

import pandas as pd

from app.data.instruments import INSTRUMENTS, get_instrument
from app.data.mcp_client import get_data_service
from app.engine.indicators import compute_all
from app.engine.signal_generator import generate_signal, summarize
from app.engine.support_resistance import detect_levels
from app.models.schemas import (AnalysisResponse, Candle, IndicatorPoint, IndicatorSet, MacdPoint,
                                MtfResponse, MtfTimeframe, Quote, ScreenerRow)

MTF_ORDER = ["15m", "1h", "4h", "1d"]


def _clean(v) -> bool:
    return v is not None and not (isinstance(v, float) and math.isnan(v))


def analyze_rows(rows: list[dict], symbol: str, timeframe: str, source: str) -> AnalysisResponse:
    inst = get_instrument(symbol)
    assert inst
    df = pd.DataFrame(rows)
    df = compute_all(df)
    levels = detect_levels(df)
    signal = generate_signal(df, levels, precision=max(inst.precision, 2))
    summary = summarize(df)

    ind = IndicatorSet(
        ma_fast=[IndicatorPoint(time=int(t), value=float(v)) for t, v in zip(df["time"], df["ma_fast"]) if _clean(v)],
        ma_slow=[IndicatorPoint(time=int(t), value=float(v)) for t, v in zip(df["time"], df["ma_slow"]) if _clean(v)],
        rsi=[IndicatorPoint(time=int(t), value=float(v)) for t, v in zip(df["time"], df["rsi"]) if _clean(v)],
        macd=[MacdPoint(time=int(r.time), macd=float(r.macd), signal=float(r.macd_signal), hist=float(r.macd_hist))
              for r in df.itertuples() if _clean(r.macd_signal)],
    )
    candles = [Candle(**{k: r[k] for k in ("time", "open", "high", "low", "close", "volume")}) for r in rows]
    return AnalysisResponse(instrument=inst, timeframe=timeframe, source=source, candles=candles,
                            indicators=ind, summary=summary, levels=levels, signal=signal)


def analyze(symbol: str, timeframe: str, fresh: bool = False) -> AnalysisResponse:
    rows, source = get_data_service().history(symbol, timeframe, fresh=fresh)
    return analyze_rows(rows, symbol, timeframe, source)


def quote(symbol: str) -> Quote:
    rows, _ = get_data_service().history(symbol, "1d")
    last, prev = rows[-1], rows[-2] if len(rows) > 1 else rows[-1]
    chg = (last["close"] - prev["close"]) / prev["close"] * 100 if prev["close"] else 0.0
    return Quote(symbol=symbol, price=last["close"], change_pct=round(chg, 3), time=last["time"])


def _change_pct(candles: list[Candle]) -> float:
    if len(candles) < 2 or not candles[-2].close:
        return 0.0
    return round((candles[-1].close - candles[-2].close) / candles[-2].close * 100, 3)


def screen(timeframe: str) -> list[ScreenerRow]:
    """Jalankan analisa untuk seluruh instrumen (dipakai screener). Instrumen yang gagal di-skip."""
    rows: list[ScreenerRow] = []
    for sym in INSTRUMENTS:
        try:
            a = analyze(sym, timeframe)
        except RuntimeError:
            continue
        s, sig = a.summary, a.signal
        rows.append(ScreenerRow(
            instrument=a.instrument, timeframe=timeframe, price=a.candles[-1].close,
            change_pct=_change_pct(a.candles), direction=sig.direction, confidence=sig.confidence,
            risk_reward=sig.risk_reward, rsi=s.rsi, rsi_state=s.rsi_state, ma_state=s.ma_state,
            macd_state=s.macd_state, entry=sig.entry, take_profit=sig.take_profit, stop_loss=sig.stop_loss,
        ))
    return rows


def multi_timeframe(symbol: str) -> MtfResponse:
    """Analisa 15m/1h/4h/1d sekaligus + bias konfluensi antar timeframe."""
    inst = get_instrument(symbol)
    assert inst
    frames: list[MtfTimeframe] = []
    for tf in MTF_ORDER:
        try:
            a = analyze(symbol, tf)
            frames.append(MtfTimeframe(timeframe=tf, signal=a.signal, summary=a.summary, source=a.source))
        except RuntimeError:
            continue
    buys = sum(1 for f in frames if f.signal.direction == "buy")
    sells = sum(1 for f in frames if f.signal.direction == "sell")
    score = buys - sells
    bias = "buy" if score > 0 else "sell" if score < 0 else "none"
    agreement = round(max(buys, sells) / len(frames), 2) if frames else 0.0
    return MtfResponse(instrument=inst, frames=frames, bias=bias, bias_score=score, agreement=agreement)
