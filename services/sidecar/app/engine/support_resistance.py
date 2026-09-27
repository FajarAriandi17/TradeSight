"""Deteksi support & resistance otomatis (metode pivot / swing high-low + clustering)."""
from __future__ import annotations

from typing import List

import numpy as np
import pandas as pd

from app.models.schemas import Level


def find_pivots(df: pd.DataFrame, window: int = 5) -> tuple[list[float], list[float]]:
    """Swing high = high tertinggi dalam +-window bar; swing low sebaliknya."""
    highs, lows = df["high"].to_numpy(), df["low"].to_numpy()
    n = len(df)
    swing_highs: list[float] = []
    swing_lows: list[float] = []
    for i in range(window, n - window):
        seg_h = highs[i - window : i + window + 1]
        seg_l = lows[i - window : i + window + 1]
        if highs[i] == seg_h.max():
            swing_highs.append(float(highs[i]))
        if lows[i] == seg_l.min():
            swing_lows.append(float(lows[i]))
    return swing_highs, swing_lows


def _cluster(prices: list[float], tolerance: float) -> list[tuple[float, int]]:
    """Gabungkan level yang berdekatan (dalam tolerance) → (harga rata-rata, jumlah sentuhan)."""
    if not prices:
        return []
    prices = sorted(prices)
    clusters: list[list[float]] = [[prices[0]]]
    for p in prices[1:]:
        if abs(p - np.mean(clusters[-1])) <= tolerance:
            clusters[-1].append(p)
        else:
            clusters.append([p])
    return [(float(np.mean(c)), len(c)) for c in clusters]


def detect_levels(df: pd.DataFrame, window: int = 5, max_levels: int = 6) -> List[Level]:
    if len(df) < window * 2 + 1:
        return []
    last_close = float(df["close"].iloc[-1])
    atr_val = df["atr"].iloc[-1] if "atr" in df and not pd.isna(df["atr"].iloc[-1]) else None
    tolerance = float(atr_val) * 0.6 if atr_val else last_close * 0.003

    swing_highs, swing_lows = find_pivots(df, window)
    clusters = _cluster(swing_highs + swing_lows, tolerance)
    if not clusters:
        return []

    max_touch = max(t for _, t in clusters)
    levels: list[Level] = []
    for price, touches in clusters:
        kind = "support" if price < last_close else "resistance"
        # kekuatan: jumlah sentuhan + kedekatan dengan harga saat ini
        proximity = 1 / (1 + abs(price - last_close) / max(tolerance, 1e-12))
        strength = 0.7 * (touches / max_touch) + 0.3 * proximity
        levels.append(Level(price=price, kind=kind, touches=touches, strength=round(strength, 3)))

    supports = sorted([l for l in levels if l.kind == "support"], key=lambda l: -l.price)
    resistances = sorted([l for l in levels if l.kind == "resistance"], key=lambda l: l.price)
    half = max_levels // 2
    # ambil level terdekat, lalu yang terkuat
    pick_s = sorted(supports[: half * 2], key=lambda l: -l.strength)[:half]
    pick_r = sorted(resistances[: half * 2], key=lambda l: -l.strength)[:half]
    return sorted(pick_s + pick_r, key=lambda l: l.price)
