"""Backtest walk-forward strategi sinyal atas data historis.

Untuk tiap bar (mulai bar ke-60) dihitung sinyal memakai HANYA data sampai bar
tersebut (tanpa look-ahead). Saat muncul setup dan tidak ada posisi terbuka,
trade dibuka di harga entry; bar-bar berikutnya diperiksa apakah TP atau SL
tersentuh lebih dulu (memakai high/low). Bila keduanya tersentuh di bar yang
sama, diasumsikan SL lebih dulu (konservatif).

Reuse penuh engine produksi (compute_all, detect_levels, generate_signal) agar
hasil backtest konsisten dengan sinyal live.
"""
from __future__ import annotations

import pandas as pd

from app.data.instruments import get_instrument
from app.data.mcp_client import get_data_service
from app.engine.indicators import compute_all
from app.engine.signal_generator import generate_signal
from app.engine.support_resistance import detect_levels
from app.models.schemas import BacktestResult, BacktestTrade

WARMUP = 60  # minimal candle sebelum sinyal pertama (samakan dengan signal_generator)


def _resolve(df: pd.DataFrame, i: int, direction: str, tp: float, sl: float) -> tuple[int, float, str] | None:
    """Cari bar pertama (> i) yang menyentuh TP atau SL. SL diprioritaskan bila sekelas."""
    for j in range(i + 1, len(df)):
        hi = float(df["high"].iloc[j])
        lo = float(df["low"].iloc[j])
        t = int(df["time"].iloc[j])
        if direction == "buy":
            if lo <= sl:
                return j, sl, "loss"
            if hi >= tp:
                return j, tp, "win"
        else:  # sell
            if hi >= sl:
                return j, sl, "loss"
            if lo <= tp:
                return j, tp, "win"
    return None


def run_backtest(rows: list[dict], symbol: str, timeframe: str, source: str) -> BacktestResult:
    inst = get_instrument(symbol)
    assert inst
    df = compute_all(pd.DataFrame(rows)).reset_index(drop=True)
    n = len(df)

    trades: list[BacktestTrade] = []
    i = WARMUP
    while i < n - 1:
        window = df.iloc[: i + 1]
        levels = detect_levels(window)
        sig = generate_signal(window, levels, precision=max(inst.precision, 2))
        if sig.direction == "none" or sig.entry is None or sig.take_profit is None or sig.stop_loss is None:
            i += 1
            continue

        entry, tp, sl = sig.entry, sig.take_profit, sig.stop_loss
        risk = abs(entry - sl)
        res = _resolve(df, i, sig.direction, tp, sl)
        trade = BacktestTrade(
            direction=sig.direction, entry=entry, take_profit=tp, stop_loss=sl,
            risk_reward=sig.risk_reward or 0.0, opened_at=int(df["time"].iloc[i]),
        )
        if res is None:  # posisi masih terbuka di ujung data
            trade.outcome = "open"
            trades.append(trade)
            break
        j, exit_price, outcome = res
        trade.closed_at = int(df["time"].iloc[j])
        trade.exit_price = round(exit_price, max(inst.precision, 2))
        trade.outcome = outcome
        trade.r_multiple = round((abs(exit_price - entry) / risk) if outcome == "win" and risk else -1.0, 3)
        if outcome == "loss":
            trade.r_multiple = -1.0
        trades.append(trade)
        i = j + 1  # lanjut scan setelah trade ditutup (no overlapping trades)

    closed = [t for t in trades if t.outcome != "open"]
    wins = [t for t in closed if t.outcome == "win"]
    losses = [t for t in closed if t.outcome == "loss"]
    win_r = sum(t.r_multiple for t in wins)
    loss_r = sum(t.r_multiple for t in losses)  # negatif
    n_closed = len(closed)

    return BacktestResult(
        instrument=inst, timeframe=timeframe, source=source, bars=n,
        trades=n_closed, wins=len(wins), losses=len(losses),
        open_trades=len(trades) - n_closed,
        win_rate=round(len(wins) / n_closed, 3) if n_closed else 0.0,
        avg_rr=round(sum(t.risk_reward for t in closed) / n_closed, 2) if n_closed else 0.0,
        expectancy_r=round((win_r + loss_r) / n_closed, 3) if n_closed else 0.0,
        profit_factor=round(win_r / abs(loss_r), 2) if loss_r else (win_r if win_r else 0.0),
        total_r=round(win_r + loss_r, 2),
        trade_list=trades[-50:],  # batasi payload
    )


def backtest(symbol: str, timeframe: str) -> BacktestResult:
    rows, source = get_data_service().history(symbol, timeframe)
    return run_backtest(rows, symbol, timeframe, source)
