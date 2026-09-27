"""Indikator teknikal dasar: MA, RSI, MACD.

Rumus identik dengan pandas-ta (SMA, RSI Wilder/RMA, MACD EMA 12/26/9) tetapi
diimplementasikan dengan pandas murni agar sidecar mudah di-bundle (PyInstaller)
tanpa dependensi berat (numba, dll). Jika ingin memakai pandas-ta, cukup ganti
fungsi di modul ini — antarmuka tetap sama.
"""
from __future__ import annotations

import pandas as pd


def sma(close: pd.Series, length: int) -> pd.Series:
    return close.rolling(window=length, min_periods=length).mean()


def ema(close: pd.Series, length: int) -> pd.Series:
    return close.ewm(span=length, adjust=False, min_periods=length).mean()


def rsi(close: pd.Series, length: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    # Wilder's smoothing (RMA) == EWM alpha=1/length
    avg_gain = gain.ewm(alpha=1 / length, adjust=False, min_periods=length).mean()
    avg_loss = loss.ewm(alpha=1 / length, adjust=False, min_periods=length).mean()
    rs = avg_gain / avg_loss.replace(0, 1e-12)
    return 100 - (100 / (1 + rs))


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    fast_ema = ema(close, fast)
    slow_ema = ema(close, slow)
    line = fast_ema - slow_ema
    sig = line.ewm(span=signal, adjust=False, min_periods=signal).mean()
    return pd.DataFrame({"macd": line, "signal": sig, "hist": line - sig})


def atr(df: pd.DataFrame, length: int = 14) -> pd.Series:
    prev_close = df["close"].shift(1)
    tr = pd.concat(
        [
            df["high"] - df["low"],
            (df["high"] - prev_close).abs(),
            (df["low"] - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    return tr.ewm(alpha=1 / length, adjust=False, min_periods=length).mean()


def compute_all(df: pd.DataFrame, ma_fast: int = 20, ma_slow: int = 50) -> pd.DataFrame:
    """Tambahkan kolom indikator ke dataframe OHLCV (kolom: time, open, high, low, close, volume)."""
    out = df.copy()
    out["ma_fast"] = sma(out["close"], ma_fast)
    out["ma_slow"] = sma(out["close"], ma_slow)
    out["rsi"] = rsi(out["close"], 14)
    m = macd(out["close"])
    out["macd"] = m["macd"]
    out["macd_signal"] = m["signal"]
    out["macd_hist"] = m["hist"]
    out["atr"] = atr(out, 14)
    return out
