# TradeSight — Trading Assistant Desktop (Forex & Saham IDX)

Aplikasi desktop **Windows (.exe)** & **macOS (.dmg)** yang menampilkan chart realtime, mendeteksi
**support & resistance** otomatis, menghitung **RSI / MACD / MA**, dan menyusun saran
**Entry / Take Profit / Stop Loss** dengan risk-reward minimal **1:2** — sesuai [`docs/PRD.md`](docs/PRD.md) (MVP Fase 1).

> ⚠️ TradeSight adalah alat bantu analisa teknikal, **bukan rekomendasi investasi**. Trading mengandung risiko kerugian.

---

## ⚙️ Aktifkan CI (sekali saja)

File workflow disimpan di [`ci/build-release.yml`](ci/build-release.yml) karena integrasi GitHub App yang dipakai
untuk push tidak punya izin `workflows`. Aktifkan dengan salah satu cara:

- **Web GitHub:** buka `ci/build-release.yml` → salin isinya → **Add file → Create new file** → nama
  `.github/workflows/build-release.yml` → paste → **Commit**.
- **Lokal:** `mkdir -p .github/workflows && git mv ci/build-release.yml .github/workflows/ && git commit -m "ci: enable" && git push`

## ⬇️ Download installer

Installer dibuat otomatis oleh GitHub Actions (tidak perlu komputer Windows/Mac fisik):

| Cara | Langkah |
|---|---|
| **Build terbaru** | Tab **Actions** → workflow **Build Release** → run terakhir → bagian **Artifacts** → `tradesight-windows-x64` (.exe) / `tradesight-macos-apple-silicon` (.dmg) |
| **Rilis resmi** | `git tag v0.1.0 && git push --tags` → installer otomatis muncul di tab **Releases** |

- **Windows:** klik 2x `TradeSight_0.1.0_x64-setup.exe`. Jika muncul *"Windows protected your PC"* (belum ada code signing) → **More info → Run anyway**.
- **macOS:** buka `.dmg`, drag TradeSight ke **Applications**. Karena belum di-notarize, buka pertama kali lewat **klik kanan → Open**
  (atau `xattr -cr /Applications/TradeSight.app`).

---

## ✅ Fitur yang sudah selesai (MVP)

| ID | Fitur | Status |
|---|---|---|
| F1 | Chart candlestick realtime + volume (lightweight-charts), timeframe 15m/1H/4H/D | ✅ |
| F2 | Deteksi support/resistance otomatis (pivot swing high-low + clustering berbasis ATR) | ✅ |
| F3 | Sinyal Entry/TP/SL, RR ≥ 1:2 (maks 1:4), overlay di chart + SignalCard + alasan "kenapa" | ✅ |
| F4 | RSI 14, MACD 12/26/9, MA 20/50 — tanpa setup manual, bisa di-toggle | ✅ |
| F5 | Watchlist tersimpan (persist lokal), tambah/hapus, harga + % perubahan dengan flash animasi | ✅ |
| F6 | Notifikasi desktop sinyal baru / TP-SL tersentuh (Premium) | ✅ (dasar) |
| F7 | Riwayat sinyal per instrumen di layar Detail | ✅ (dasar) |
| F8 | Paywall freemium: watchlist 5, timeframe 15m/4H, notifikasi & riwayat lengkap dikunci | ✅ |
| — | Onboarding 3 slide + disclaimer wajib, disclaimer di setiap sinyal & footer | ✅ |
| — | Settings: tema gelap/terang, notifikasi, lisensi, status engine | ✅ |
| — | Label **DELAYED DATA** untuk saham IDX, status koneksi Live/Offline | ✅ |
| — | Fallback data demo offline + cache SQLite lokal | ✅ |
| — | CI GitHub Actions → `.exe` (NSIS, EN/ID) & `.dmg` | ✅ |

**Instrumen MVP:** EURUSD, GBPUSD, USDJPY, AUDUSD, XAUUSD + BBCA, BBRI, BMRI, BBNI, TLKM, ASII, UNVR, ICBP, ADRO, GOTO.

## ⏳ Belum diimplementasikan (Fase 2–3)

- Payment gateway Midtrans + License/Auth Server online (sekarang: validasi kode lisensi offline sebagai placeholder, format `TS-XXXX-XXXX-XXXX`).
- Screener custom, multi-timeframe dalam satu layar, jurnal trading.
- Backtesting, integrasi broker MT4/MT5, data IDX resmi realtime.
- Code signing Windows & notarization macOS.
- Build macOS Intel (x86_64) — saat ini CI membuat build Apple Silicon.

## 🏗️ Arsitektur

```
┌──────────── Tauri v2 (Rust shell) ────────────┐
│  React + TS + Tailwind + Zustand              │      ┌── Sumber data (modular) ──┐
│  lightweight-charts                           │      │ 1. tradingview-mcp (opsional)
│        │ REST  GET /instruments/{s}/history   │      │ 2. Yahoo chart publik      │
│        │ WS    ws://127.0.0.1:8765/stream/{s} │      │ 3. Demo offline            │
│        ▼                                      │      └────────────▲──────────────┘
│  Python sidecar (FastAPI, PyInstaller binary) ├─────────────────────┘
│   engine: indicators · support_resistance ·   │
│           signal_generator   cache: SQLite    │
└───────────────────────────────────────────────┘
```

Sidecar di-spawn otomatis oleh Tauri saat app dibuka dan dimatikan saat app ditutup.
Detail keputusan: [`docs/architecture-decisions/0001-data-layer-and-sidecar.md`](docs/architecture-decisions/0001-data-layer-and-sidecar.md).

### Struktur repo

```
apps/desktop/            Tauri + React (frontend)
  src/components/        chart/ watchlist/ signal/ common/ layout/
  src/screens/           Dashboard, Detail, Onboarding, Settings, Paywall
  src/stores/            Zustand (watchlist, chart, user)
  src/services/          api.ts (REST), wsClient.ts (WebSocket)
  src-tauri/             Rust, tauri.conf.json (bundler nsis/dmg), icons
services/sidecar/        FastAPI + analysis engine (+ tests)
scripts/build_sidecar.py PyInstaller → src-tauri/binaries/tradesight-sidecar-<triple>
ci/build-release.yml     workflow CI (pindahkan ke .github/workflows/)
```

## 🔌 API sidecar (localhost:8765)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | status & urutan provider data |
| GET | `/instruments` | daftar instrumen |
| GET | `/instruments/{symbol}/history?timeframe=1h` | OHLCV + indikator + level S/R + sinyal |
| GET | `/instruments/{symbol}/signal?timeframe=1h` | sinyal + level + ringkasan indikator |
| GET | `/quotes?symbols=EURUSD,BBCA` | harga terakhir & % perubahan harian |
| WS | `/stream/{symbol}?timeframe=1h` | tick candle terakhir tiap 5 dtk, sinyal/level saat berubah |

**Konfigurasi (env):** `TRADESIGHT_PROVIDERS=mcp,yahoo,demo` · `TRADESIGHT_MCP_CMD="uvx tradingview-mcp"` ·
`TRADESIGHT_MCP_TOOL=get_historical_data` · `TRADESIGHT_POLL_SECONDS=5` · `TRADESIGHT_DATA_DIR`.

## 🧪 Development lokal

Prasyarat: Node 20+, Python 3.10+, Rust stable ([prasyarat Tauri](https://v2.tauri.app/start/prerequisites/)).

```bash
# 1) Sidecar
cd services/sidecar
pip install -r requirements.txt
python -m pytest -q          # tes engine + API
python -m app.main           # http://127.0.0.1:8765

# 2) Frontend (terminal lain) — bisa dicoba di browser: http://localhost:1420
cd apps/desktop
npm install
npm run dev

# 3) Aplikasi desktop + installer untuk OS saat ini
python scripts/build_sidecar.py   # dari root repo
cd apps/desktop && npm run tauri build
# → src-tauri/target/release/bundle/nsis/*.exe  atau  bundle/dmg/*.dmg
```

## 🎨 Design system

Token warna PRD §10.1 di `apps/desktop/src/styles/tokens.css` (`--bg-primary #0B0E14`, `--accent-buy #22C55E`,
`--accent-tp #3B82F6`, `--accent-sl #EF4444`, …). Font Inter + JetBrains Mono. Animasi PRD §11: transisi layar
200ms, draw sinyal 300ms, flash harga, hover scale 1.02, skeleton shimmer 1.2s, modal scale 0.96→1.

## 🚀 Langkah berikutnya yang disarankan

1. Uji installer di mesin Windows & Mac bersih; kumpulkan feedback beta.
2. Backtest akurasi sinyal (engine sudah terpisah & mudah diuji).
3. Hubungkan `tradingview-mcp` / data broker resmi lewat provider baru.
4. Implementasi License Server + Midtrans, lalu code signing.

---
**Status:** MVP v0.1.0 · Stack: Tauri 2 · React 18 · TypeScript · Tailwind · Zustand · lightweight-charts · FastAPI · pandas · **Terakhir diperbarui:** 27 Sep 2026
