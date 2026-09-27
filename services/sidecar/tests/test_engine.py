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
