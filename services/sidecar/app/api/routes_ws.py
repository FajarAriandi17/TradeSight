"""WebSocket streaming harga + sinyal realtime (ws://127.0.0.1:PORT/stream/{symbol}?timeframe=1h)."""
from __future__ import annotations

import asyncio
import os
import random

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool

from app.data.instruments import get_instrument
from app.data.mcp_client import get_data_service
from app.engine.analysis import analyze_rows

router = APIRouter()
POLL_SECONDS = float(os.environ.get("TRADESIGHT_POLL_SECONDS", "5"))


def _simulate_tick(rows: list[dict], symbol: str) -> None:
    """Untuk sumber demo/offline: gerakkan candle terakhir agar UI tetap 'live'."""
    last = rows[-1]
    vol = 0.0004 if get_instrument(symbol).asset_class == "forex" else 0.0015
    c = last["close"] * (1 + random.gauss(0, vol))
    last["close"] = c
    last["high"] = max(last["high"], c)
    last["low"] = min(last["low"], c)


@router.websocket("/stream/{symbol}")
async def stream(ws: WebSocket, symbol: str):
    await ws.accept()
    symbol = symbol.upper()
    timeframe = ws.query_params.get("timeframe", "1h")
    if not get_instrument(symbol):
        await ws.send_json({"type": "error", "message": "Instrumen tidak didukung"})
        await ws.close()
        return
    svc = get_data_service()
    last_sig = None
    demo_rows: list[dict] | None = None
    try:
        while True:
            rows, source = await run_in_threadpool(svc.history, symbol, timeframe)
            if source.startswith("demo"):
                demo_rows = demo_rows or [dict(r) for r in rows]
                _simulate_tick(demo_rows, symbol)
                rows = demo_rows
            res = await run_in_threadpool(analyze_rows, rows, symbol, timeframe, source)
            last = res.candles[-1]
            payload = {"type": "tick", "symbol": symbol, "timeframe": timeframe, "source": source,
                       "candle": last.model_dump(), "summary": res.summary.model_dump()}
            sig_key = (res.signal.direction, res.signal.entry, res.signal.take_profit, res.signal.stop_loss)
            if sig_key != last_sig:
                payload["signal"] = res.signal.model_dump()
                payload["levels"] = [l.model_dump() for l in res.levels]
                last_sig = sig_key
            await ws.send_json(payload)
            await asyncio.sleep(POLL_SECONDS)
    except (WebSocketDisconnect, RuntimeError):
        return
