"""Logika sinyal entry / TP / SL dengan risk-reward minimal 1:2.

Skor konfluensi dari beberapa faktor:
  * Tren MA (fast vs slow, harga vs MA)            ±2
  * Momentum MACD (posisi & crossover histogram)    ±2
  * RSI (oversold/overbought, zona momentum)        ±1..2
  * Kedekatan ke support (buy) / resistance (sell)  +1

Skor >= THRESHOLD → buy, skor <= -THRESHOLD → sell.
SL ditempatkan di balik level S/R terdekat (+ buffer ATR), TP memakai level
S/R berikutnya bila RR >= 2, jika tidak TP = entry ± 2 × risk.
"""
from __future__ import annotations

import time
from typing import List

import pandas as pd

from app.models.schemas import IndicatorSummary, Level, Signal

THRESHOLD = 3
MIN_RR = 2.0
MAX_RR = 4.0  # TP berbasis level S/R yang terlalu jauh diganti TP = MIN_RR x risk


def summarize(df: pd.DataFrame) -> IndicatorSummary:
    last = df.iloc[-1]

    def val(col: str):
        v = last.get(col)
        return None if v is None or pd.isna(v) else float(v)

    s = IndicatorSummary(
        rsi=val("rsi"),
        macd=val("macd"),
        macd_signal=val("macd_signal"),
        macd_hist=val("macd_hist"),
        ma_fast=val("ma_fast"),
        ma_slow=val("ma_slow"),
    )
    if s.rsi is not None:
        s.rsi_state = "oversold" if s.rsi < 30 else "overbought" if s.rsi > 70 else "neutral"
    if s.macd_hist is not None:
        s.macd_state = "bullish" if s.macd_hist > 0 else "bearish" if s.macd_hist < 0 else "neutral"
    if s.ma_fast is not None and s.ma_slow is not None:
        s.ma_state = "bullish" if s.ma_fast > s.ma_slow else "bearish" if s.ma_fast < s.ma_slow else "neutral"
    return s


def generate_signal(df: pd.DataFrame, levels: List[Level], precision: int = 5) -> Signal:
    now = int(time.time())
    if len(df) < 60:
        return Signal(direction="none", reasons=["Data historis belum cukup (< 60 candle)."], generated_at=now)

    last = df.iloc[-1]
    prev = df.iloc[-2]
    close = float(last["close"])
    atr = float(last["atr"]) if not pd.isna(last["atr"]) else close * 0.005

    score = 0
    bull: list[str] = []
    bear: list[str] = []

    # --- Tren MA
    if last["ma_fast"] > last["ma_slow"]:
        score += 1; bull.append("MA20 di atas MA50 (tren naik)")
    elif last["ma_fast"] < last["ma_slow"]:
        score -= 1; bear.append("MA20 di bawah MA50 (tren turun)")
    if close > last["ma_fast"]:
        score += 1; bull.append("Harga di atas MA20")
    elif close < last["ma_fast"]:
        score -= 1; bear.append("Harga di bawah MA20")

    # --- MACD
    if last["macd_hist"] > 0:
        score += 1; bull.append("Histogram MACD positif")
    elif last["macd_hist"] < 0:
        score -= 1; bear.append("Histogram MACD negatif")
    if prev["macd_hist"] <= 0 < last["macd_hist"]:
        score += 1; bull.append("MACD bullish crossover")
    elif prev["macd_hist"] >= 0 > last["macd_hist"]:
        score -= 1; bear.append("MACD bearish crossover")

    # --- RSI
    r = float(last["rsi"])
    if r < 30:
        score += 2; bull.append(f"RSI oversold ({r:.1f})")
    elif r > 70:
        score -= 2; bear.append(f"RSI overbought ({r:.1f})")
    elif 50 < r <= 65:
        score += 1; bull.append(f"RSI zona momentum naik ({r:.1f})")
    elif 35 <= r < 50:
        score -= 1; bear.append(f"RSI zona momentum turun ({r:.1f})")

    supports = sorted([l.price for l in levels if l.price < close], reverse=True)
    resistances = sorted([l.price for l in levels if l.price > close])

    # --- Kedekatan S/R
    if supports and (close - supports[0]) <= atr * 1.0:
        score += 1; bull.append("Harga dekat area support")
    if resistances and (resistances[0] - close) <= atr * 1.0:
        score -= 1; bear.append("Harga dekat area resistance")

    confidence = min(abs(score) / 7, 1.0)
    rnd = lambda x: round(float(x), precision)

    if score >= THRESHOLD:
        entry = close
        sl_base = supports[0] if supports and (close - supports[0]) <= atr * 3 else close - atr * 1.5
        sl = min(sl_base - atr * 0.25, close - atr * 0.5)
        risk = entry - sl
        tp = next((p for p in resistances if MIN_RR <= (p - entry) / risk <= MAX_RR), entry + risk * MIN_RR)
        rr = (tp - entry) / risk
        return Signal(direction="buy", entry=rnd(entry), take_profit=rnd(tp), stop_loss=rnd(sl),
                      risk_reward=round(rr, 2), confidence=round(confidence, 2),
                      status="active-signal", reasons=bull, generated_at=now)
    if score <= -THRESHOLD:
        entry = close
        sl_base = resistances[0] if resistances and (resistances[0] - close) <= atr * 3 else close + atr * 1.5
        sl = max(sl_base + atr * 0.25, close + atr * 0.5)
        risk = sl - entry
        tp = next((p for p in supports if MIN_RR <= (entry - p) / risk <= MAX_RR), entry - risk * MIN_RR)
        rr = (entry - tp) / risk
        return Signal(direction="sell", entry=rnd(entry), take_profit=rnd(tp), stop_loss=rnd(sl),
                      risk_reward=round(rr, 2), confidence=round(confidence, 2),
                      status="active-signal", reasons=bear, generated_at=now)

    return Signal(direction="none", confidence=round(confidence, 2), status="no-signal",
                  reasons=["Konfluensi indikator belum cukup kuat (skor %+d)." % score] + (bull or bear)[:3],
                  generated_at=now)
