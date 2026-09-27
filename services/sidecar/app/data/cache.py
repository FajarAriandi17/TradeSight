"""Cache lokal (SQLite) untuk data OHLCV agar tidak fetch berulang."""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
from pathlib import Path


def _default_path() -> Path:
    base = os.environ.get("TRADESIGHT_DATA_DIR")
    if base:
        p = Path(base)
    elif os.name == "nt":
        p = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "TradeSight"
    else:
        p = Path.home() / ".tradesight"
    p.mkdir(parents=True, exist_ok=True)
    return p / "cache.sqlite3"


class Cache:
    def __init__(self, path: Path | None = None):
        self.path = path or _default_path()
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(str(self.path), check_same_thread=False)
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS ohlcv (key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at REAL NOT NULL)"
        )
        self._conn.commit()

    def get(self, key: str, max_age: float) -> list | None:
        with self._lock:
            row = self._conn.execute("SELECT payload, updated_at FROM ohlcv WHERE key=?", (key,)).fetchone()
        if not row or (time.time() - row[1]) > max_age:
            return None
        return json.loads(row[0])

    def get_stale(self, key: str) -> list | None:
        with self._lock:
            row = self._conn.execute("SELECT payload FROM ohlcv WHERE key=?", (key,)).fetchone()
        return json.loads(row[0]) if row else None

    def set(self, key: str, payload: list) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT OR REPLACE INTO ohlcv (key, payload, updated_at) VALUES (?, ?, ?)",
                (key, json.dumps(payload), time.time()),
            )
            self._conn.commit()


_cache: Cache | None = None


def get_cache() -> Cache:
    global _cache
    if _cache is None:
        try:
            _cache = Cache()
        except Exception:  # fallback in-memory
            _cache = Cache(Path(":memory:"))
    return _cache
