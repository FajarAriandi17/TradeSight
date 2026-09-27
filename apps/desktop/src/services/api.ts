import type { Analysis, BacktestResult, Instrument, MtfResult, Quote, ScreenerFilters, ScreenerRow, Timeframe } from './types'

/** Alamat sidecar lokal. Dapat dioverride lewat VITE_SIDECAR_URL (mis. saat dev di browser). */
export const SIDECAR_URL: string =
  (import.meta.env.VITE_SIDECAR_URL as string | undefined) ?? 'http://127.0.0.1:8765'

export const WS_URL = SIDECAR_URL.replace(/^http/, 'ws')

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${SIDECAR_URL}${path}`, { signal })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () => get<{ status: string; version: string; providers: string[] }>('/health'),
  instruments: () => get<Instrument[]>('/instruments'),
  history: (symbol: string, timeframe: Timeframe, signal?: AbortSignal) =>
    get<Analysis>(`/instruments/${symbol}/history?timeframe=${timeframe}`, signal),
  quotes: (symbols: string[]) => get<Quote[]>(`/quotes?symbols=${symbols.join(',')}`),
  mtf: (symbol: string, signal?: AbortSignal) => get<MtfResult>(`/instruments/${symbol}/mtf`, signal),
  backtest: (symbol: string, timeframe: Timeframe, signal?: AbortSignal) =>
    get<BacktestResult>(`/instruments/${symbol}/backtest?timeframe=${timeframe}`, signal),
  screener: (f: ScreenerFilters, signal?: AbortSignal) =>
    get<ScreenerRow[]>(
      `/screener?timeframe=${f.timeframe}&direction=${f.direction}&asset_class=${f.asset_class}` +
        `&min_rr=${f.min_rr}&min_confidence=${f.min_confidence}`,
      signal,
    ),
}

/** Tunggu sidecar siap (dipakai saat app baru dibuka, sidecar butuh waktu start). */
export async function waitForSidecar(timeoutMs = 30000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      await api.health()
      return true
    } catch {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  return false
}
