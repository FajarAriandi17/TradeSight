"""Entrypoint FastAPI sidecar TradeSight.

Jalankan dev:  python -m app.main  (default 127.0.0.1:8765)
Di dalam app desktop, binary hasil PyInstaller dijalankan oleh Tauri sebagai sidecar.
"""
from __future__ import annotations

import argparse
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_instruments import router as instruments_router
from app.api.routes_ws import router as ws_router

VERSION = "0.1.0"

app = FastAPI(title="TradeSight Sidecar", version=VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hanya listen di localhost
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(instruments_router)
app.include_router(ws_router)


@app.get("/health")
def health():
    from app.data.mcp_client import get_data_service
    return {"status": "ok", "version": VERSION, "providers": [p.name for p in get_data_service().providers]}


def run() -> None:
    import uvicorn

    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=os.environ.get("TRADESIGHT_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("TRADESIGHT_PORT", "8765")))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    uvicorn.run(app, host=args.host, port=args.port, log_level="info", ws="websockets")


if __name__ == "__main__":
    run()
