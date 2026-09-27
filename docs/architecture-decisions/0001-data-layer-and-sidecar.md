# ADR 0001 — Data layer modular & sidecar PyInstaller

**Status:** Diterima · 27 Sep 2026

## Konteks
PRD §7 menetapkan `tradingview-mcp` (unofficial) sebagai data layer awal, dengan risiko
berhenti berfungsi (§9, §16). Aplikasi desktop juga harus bisa diinstal tanpa user
memasang Python.

## Keputusan
1. **Data layer berlapis** (`app/data/mcp_client.py`): `mcp` → `yahoo` → `demo`, diatur via
   env `TRADESIGHT_PROVIDERS`. Provider MCP aktif bila `TRADESIGHT_MCP_CMD` diisi
   (mis. `uvx tradingview-mcp`). Default MVP memakai endpoint chart publik (gratis, IDX
   delay ±15 menit, diberi label "DELAYED DATA" di UI) dan jatuh ke data demo offline
   bila tidak ada koneksi. Hasil di-cache di SQLite lokal.
2. **Indikator dengan pandas murni** (rumus identik pandas-ta: SMA, RSI Wilder, MACD 12/26/9, ATR)
   agar binary PyInstaller kecil & stabil lintas OS. Antarmuka `indicators.py` tetap,
   sehingga bisa ditukar ke pandas-ta kapan saja.
3. **Sidecar = binary PyInstaller onefile** yang di-bundle Tauri via `externalBin`
   (`tradesight-sidecar-<target-triple>`), di-spawn saat app start & di-kill saat exit.
   Listen hanya di `127.0.0.1:8765`.

## Konsekuensi
- Ganti sumber data cukup menambah class provider baru.
- Build sidecar harus dilakukan per-OS (ditangani GitHub Actions).
