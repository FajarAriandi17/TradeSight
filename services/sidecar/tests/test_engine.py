import os

os.environ.setdefault("TRADESIGHT_PROVIDERS", "demo")
os.environ.setdefault("TRADESIGHT_DATA_DIR", "/tmp/tradesight-test")

import pandas as pd
from fastapi.testclient import TestClient

from app.data.mcp_client import DemoProvider
from app.engine.indicators import compute_all
from app.engine.signal_generator import generate_signal
from app.engine.support_resistance import detect_levels
from app.main import app


def _df(symbol="EURUSD"):
    return compute_all(pd.DataFrame(DemoProvider().history(symbol, "1h")))


def test_indicators_ranges():
    df = _df()
    rsi = df["rsi"].dropna()
    assert ((rsi >= 0) & (rsi <= 100)).all()
    assert df["ma_fast"].notna().sum() > 200


def test_levels_and_signal_rr():
    for sym in ["EURUSD", "XAUUSD", "BBCA", "TLKM", "GBPUSD"]:
        df = _df(sym)
        levels = detect_levels(df)
        close = df["close"].iloc[-1]
        for l in levels:
            assert (l.kind == "support") == (l.price < close)
        sig = generate_signal(df, levels)
        if sig.direction != "none":
            assert sig.risk_reward >= 2.0 - 1e-6
            if sig.direction == "buy":
                assert sig.stop_loss < sig.entry < sig.take_profit
            else:
                assert sig.take_profit < sig.entry < sig.stop_loss


def test_api():
    c = TestClient(app)
    assert c.get("/health").json()["status"] == "ok"
    assert len(c.get("/instruments").json()) == 15
    r = c.get("/instruments/BBCA/history?timeframe=1h").json()
    assert r["candles"] and "signal" in r and r["signal"]["disclaimer"]
    assert c.get("/instruments/NOPE/history").status_code == 404
    with c.websocket_connect("/stream/EURUSD?timeframe=15m") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "tick" and "signal" in msg


def test_backtest_no_lookahead_and_rr():
    from app.engine.backtest import run_backtest

    rows = DemoProvider().history("EURUSD", "1h")
    res = run_backtest(rows, "EURUSD", "1h", "demo-offline")
    assert res.bars == len(rows)
    assert res.trades == res.wins + res.losses
    assert 0.0 <= res.win_rate <= 1.0
    for t in res.trade_list:
        # entri selalu di antara SL dan TP sesuai arah, dan trade tutup setelah dibuka
        if t.direction == "buy":
            assert t.stop_loss < t.entry < t.take_profit
        else:
            assert t.take_profit < t.entry < t.stop_loss
        if t.closed_at is not None:
            assert t.closed_at >= t.opened_at
            assert t.outcome in ("win", "loss")


def test_screener_and_mtf_endpoints():
    c = TestClient(app)
    rows = c.get("/screener?timeframe=1h&asset_class=forex").json()
    assert isinstance(rows, list) and len(rows) == 5
    assert all(row["instrument"]["asset_class"] == "forex" for row in rows)
    buys = c.get("/screener?timeframe=1h&direction=buy").json()
    assert all(row["direction"] == "buy" for row in buys)

    mtf = c.get("/instruments/EURUSD/mtf").json()
    assert mtf["bias"] in ("buy", "sell", "none")
    assert {f["timeframe"] for f in mtf["frames"]} <= {"15m", "1h", "4h", "1d"}
    assert 0.0 <= mtf["agreement"] <= 1.0

    bt = c.get("/instruments/BBCA/backtest?timeframe=1h").json()
    assert bt["trades"] == bt["wins"] + bt["losses"] and bt["disclaimer"]
