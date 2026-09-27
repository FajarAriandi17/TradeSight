"""Data layer modular (PRD §9 & §16: "desain data layer modular agar mudah ganti sumber data").

Urutan provider (bisa diatur via env TRADESIGHT_PROVIDERS, default "mcp,yahoo,demo"):

1. ``mcp``   — tradingview-mcp (unofficial) lewat protokol MCP stdio. Aktif hanya jika
               env ``TRADESIGHT_MCP_CMD`` diisi, mis. ``uvx tradingview-mcp``.
               Nama tool bisa diatur via ``TRADESIGHT_MCP_TOOL`` (default ``get_historical_data``).
2. ``yahoo`` — endpoint chart publik (gratis, IDX delay ±15 menit).
3. ``demo``  — data sintetis deterministik (offline), agar app tetap bisa dipakai tanpa internet.
"""
from __future__ import annotations

import json
import logging
import math
import os
import random
import shlex
import subprocess
import threading
import time
from typing import Protocol

import httpx

from app.data.cache import get_cache
from app.data.instruments import TV_SYMBOLS, YAHOO_SYMBOLS

log = logging.getLogger("tradesight.data")

TF_SECONDS = {"15m": 900, "1h": 3600, "4h": 14400, "1d": 86400}
CACHE_TTL = {"15m": 30, "1h": 60, "4h": 180, "1d": 600}


class Provider(Protocol):
    name: str

    def history(self, symbol: str, timeframe: str) -> list[dict]: ...


# --------------------------------------------------------------------------- MCP
class McpStdioClient:
    """Klien MCP minimal (JSON-RPC 2.0 over stdio)."""

    def __init__(self, cmd: str):
        self.cmd = cmd
        self._proc: subprocess.Popen | None = None
        self._id = 0
        self._lock = threading.Lock()

    def _start(self) -> None:
        self._proc = subprocess.Popen(
            shlex.split(self.cmd), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, text=True, bufsize=1,
        )
        self._rpc("initialize", {
            "protocolVersion": "2024-11-05", "capabilities": {},
            "clientInfo": {"name": "tradesight-sidecar", "version": "0.1.0"},
        })
        self._notify("notifications/initialized", {})

    def _notify(self, method: str, params: dict) -> None:
        assert self._proc and self._proc.stdin
        self._proc.stdin.write(json.dumps({"jsonrpc": "2.0", "method": method, "params": params}) + "\n")
        self._proc.stdin.flush()

    def _rpc(self, method: str, params: dict, timeout: float = 20) -> dict:
        assert self._proc and self._proc.stdin and self._proc.stdout
        self._id += 1
        rid = self._id
        self._proc.stdin.write(json.dumps({"jsonrpc": "2.0", "id": rid, "method": method, "params": params}) + "\n")
        self._proc.stdin.flush()
        deadline = time.time() + timeout
        while time.time() < deadline:
            line = self._proc.stdout.readline()
            if not line:
                raise RuntimeError("MCP server berhenti")
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue
            if msg.get("id") == rid:
                if "error" in msg:
                    raise RuntimeError(msg["error"])
                return msg.get("result", {})
        raise TimeoutError("MCP timeout")

    def call_tool(self, name: str, arguments: dict) -> dict:
        with self._lock:
            if self._proc is None or self._proc.poll() is not None:
                self._start()
            return self._rpc("tools/call", {"name": name, "arguments": arguments})


class McpProvider:
    name = "tradingview-mcp"

    def __init__(self, cmd: str):
        self.client = McpStdioClient(cmd)
        self.tool = os.environ.get("TRADESIGHT_MCP_TOOL", "get_historical_data")

    def history(self, symbol: str, timeframe: str) -> list[dict]:
        tv = TV_SYMBOLS[symbol]
        exchange, ticker = tv.split(":")
        res = self.client.call_tool(self.tool, {
            "symbol": ticker, "exchange": exchange, "timeframe": timeframe, "interval": timeframe, "limit": 300,
        })
        # hasil MCP berupa content[].text berisi JSON
        for item in res.get("content", []):
            if item.get("type") == "text":
                data = json.loads(item["text"])
                rows = data.get("data", data) if isinstance(data, dict) else data
                return _normalize_rows(rows)
        raise RuntimeError("Respons MCP tidak dikenali")


def _normalize_rows(rows: list) -> list[dict]:
    out = []
    for r in rows:
        t = r.get("time") or r.get("timestamp") or r.get("datetime")
        if isinstance(t, str):
            from datetime import datetime
            t = int(datetime.fromisoformat(t.replace("Z", "+00:00")).timestamp())
        elif t and t > 1e12:
            t = int(t / 1000)
        out.append({"time": int(t), "open": float(r["open"]), "high": float(r["high"]),
                    "low": float(r["low"]), "close": float(r["close"]), "volume": float(r.get("volume") or 0)})
    return sorted(out, key=lambda x: x["time"])


# --------------------------------------------------------------------------- Yahoo
class YahooProvider:
    name = "yahoo-public"
    _PARAMS = {"15m": ("15m", "30d"), "1h": ("60m", "90d"), "4h": ("60m", "180d"), "1d": ("1d", "2y")}

    def __init__(self) -> None:
        self.http = httpx.Client(timeout=10, headers={"User-Agent": "Mozilla/5.0 TradeSight/0.1"})

    def history(self, symbol: str, timeframe: str) -> list[dict]:
        interval, rng = self._PARAMS[timeframe]
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{YAHOO_SYMBOLS[symbol]}"
        r = self.http.get(url, params={"interval": interval, "range": rng})
        r.raise_for_status()
        res = r.json()["chart"]["result"][0]
        ts = res.get("timestamp") or []
        q = res["indicators"]["quote"][0]
        rows = []
        for i, t in enumerate(ts):
            o, h, l, c = q["open"][i], q["high"][i], q["low"][i], q["close"][i]
            if None in (o, h, l, c):
                continue
            rows.append({"time": int(t), "open": o, "high": h, "low": l, "close": c, "volume": q["volume"][i] or 0})
        if timeframe == "4h":
            rows = _resample(rows, 14400)
        if len(rows) < 30:
            raise RuntimeError("Data Yahoo terlalu sedikit")
        return rows[-500:]


def _resample(rows: list[dict], sec: int) -> list[dict]:
    buckets: dict[int, dict] = {}
    for r in rows:
        b = r["time"] - r["time"] % sec
        if b not in buckets:
            buckets[b] = {**r, "time": b}
        else:
            x = buckets[b]
            x["high"] = max(x["high"], r["high"]); x["low"] = min(x["low"], r["low"])
            x["close"] = r["close"]; x["volume"] += r["volume"]
    return [buckets[k] for k in sorted(buckets)]


# --------------------------------------------------------------------------- Demo
_BASE_PRICE = {"EURUSD": 1.085, "GBPUSD": 1.27, "USDJPY": 149.5, "AUDUSD": 0.66, "XAUUSD": 2650.0,
               "BBCA": 9800, "BBRI": 4600, "BMRI": 6200, "BBNI": 5100, "TLKM": 3100, "ASII": 5000,
               "UNVR": 1900, "ICBP": 11000, "ADRO": 2600, "GOTO": 70}


class DemoProvider:
    name = "demo-offline"

    def history(self, symbol: str, timeframe: str) -> list[dict]:
        step = TF_SECONDS[timeframe]
        n = 300
        now = int(time.time())
        end = now - now % step
        rng = random.Random(f"{symbol}-{timeframe}")
        price = _BASE_PRICE.get(symbol, 100.0)
        vol = 0.0025 if symbol in ("EURUSD", "GBPUSD", "AUDUSD", "USDJPY") else 0.008
        vol *= math.sqrt(step / 3600)
        rows = []
        for i in range(n):
            t = end - (n - 1 - i) * step
            drift = math.sin(i / 25) * vol * 0.4
            o = price
            c = o * (1 + drift + rng.gauss(0, vol))
            h = max(o, c) * (1 + abs(rng.gauss(0, vol / 2)))
            l = min(o, c) * (1 - abs(rng.gauss(0, vol / 2)))
            rows.append({"time": t, "open": o, "high": h, "low": l, "close": c, "volume": rng.randint(1000, 90000)})
            price = c
        return rows


# --------------------------------------------------------------------------- Facade
class DataService:
    def __init__(self) -> None:
        order = os.environ.get("TRADESIGHT_PROVIDERS", "mcp,yahoo,demo").split(",")
        self.providers: list[Provider] = []
        for name in order:
            name = name.strip()
            if name == "mcp" and os.environ.get("TRADESIGHT_MCP_CMD"):
                self.providers.append(McpProvider(os.environ["TRADESIGHT_MCP_CMD"]))
            elif name == "yahoo":
                self.providers.append(YahooProvider())
            elif name == "demo":
                self.providers.append(DemoProvider())
        if not self.providers:
            self.providers.append(DemoProvider())
        self.last_source: dict[str, str] = {}

    def history(self, symbol: str, timeframe: str, fresh: bool = False) -> tuple[list[dict], str]:
        key = f"{symbol}:{timeframe}"
        cache = get_cache()
        if not fresh:
            cached = cache.get(key, CACHE_TTL[timeframe])
            if cached and key in self.last_source:
                return cached, self.last_source[key]
        for p in self.providers:
            try:
                rows = p.history(symbol, timeframe)
                if rows:
                    cache.set(key, rows)
                    self.last_source[key] = p.name
                    return rows, p.name
            except Exception as e:  # noqa: BLE001
                log.warning("provider %s gagal untuk %s: %s", p.name, key, e)
        stale = cache.get_stale(key)
        if stale:
            return stale, "cache-stale"
        raise RuntimeError("Semua sumber data gagal")


_service: DataService | None = None


def get_data_service() -> DataService:
    global _service
    if _service is None:
        _service = DataService()
    return _service
