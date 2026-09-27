import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { fmtPrice } from '../services/format'
import { useChartStore } from '../stores/useChartStore'
import { useUserStore } from '../stores/useUserStore'
import { useWatchlistStore } from '../stores/useWatchlistStore'
import { LoadingSkeleton } from '../components/common/LoadingSkeleton'
import type { ScreenerFilters, ScreenerRow, Timeframe } from '../services/types'

const TFS: Timeframe[] = ['15m', '1h', '4h', '1d']
const DIR_STYLE: Record<string, string> = {
  buy: 'bg-buy/15 text-buy',
  sell: 'bg-sl/15 text-sl',
  none: 'bg-bg-elevated text-txt-muted',
}
const DIR_LABEL: Record<string, string> = { buy: 'BUY', sell: 'SELL', none: '—' }

/** Screener multi-instrumen — pindai semua instrumen sekaligus (PRD Fase 2, premium). */
export function ScreenerScreen() {
  const plan = useUserStore((s) => s.plan)
  const openPaywall = useUserStore((s) => s.openPaywall)
  const setSymbol = useChartStore((s) => s.setSymbol)
  const setScreen = useUserStore((s) => s.setScreen)
  const addWatch = useWatchlistStore((s) => s.add)

  const [filters, setFilters] = useState<ScreenerFilters>({
    timeframe: '1h', direction: 'any', asset_class: 'all', min_rr: 2, min_confidence: 0,
  })
  const [rows, setRows] = useState<ScreenerRow[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (plan !== 'premium') return
    const ctrl = new AbortController()
    setState('loading')
    api
      .screener(filters, ctrl.signal)
      .then((r) => { setRows(r); setState('ok') })
      .catch(() => setState('error'))
    return () => ctrl.abort()
  }, [filters, plan])

  const open = (symbol: string) => { setSymbol(symbol); addWatch(symbol); setScreen('dashboard') }
  const set = <K extends keyof ScreenerFilters>(k: K, v: ScreenerFilters[K]) => setFilters((f) => ({ ...f, [k]: v }))

  if (plan === 'free') {
    return (
      <div className="anim-screen flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-card border border-border-subtle bg-bg-surface p-8 text-center">
          <div className="mb-3 text-3xl">📡</div>
          <h2 className="mb-2 text-lg font-bold">Market Screener</h2>
          <p className="mb-4 text-sm text-txt-muted">
            Pindai seluruh instrumen Forex &amp; IDX sekaligus untuk menemukan setup terbaik berdasarkan
            arah, risk/reward, dan kekuatan konfluensi.
          </p>
          <button
            onClick={() => openPaywall('Market screener tersedia di Premium.')}
            className="w-full rounded-btn bg-gradient-to-r from-tp to-buy py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            ✦ Buka Screener di Premium
          </button>
        </div>
      </div>
    )
  }

  return (
    <div id="screener-screen" className="anim-screen flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-bg-surface p-3 text-xs">
        <h2 className="mr-2 text-sm font-bold">Screener</h2>
        <select value={filters.timeframe} onChange={(e) => set('timeframe', e.target.value as Timeframe)}
          className="rounded-btn border border-border-subtle bg-bg-primary px-2 py-1 outline-none focus:border-tp">
          {TFS.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
        <select value={filters.direction} onChange={(e) => set('direction', e.target.value as ScreenerFilters['direction'])}
          className="rounded-btn border border-border-subtle bg-bg-primary px-2 py-1 outline-none focus:border-tp">
          <option value="any">Ada Setup</option>
          <option value="all">Semua</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <select value={filters.asset_class} onChange={(e) => set('asset_class', e.target.value as ScreenerFilters['asset_class'])}
          className="rounded-btn border border-border-subtle bg-bg-primary px-2 py-1 outline-none focus:border-tp">
          <option value="all">Forex + IDX</option>
          <option value="forex">Forex</option>
          <option value="idx">IDX</option>
        </select>
        <label className="flex items-center gap-1 text-txt-muted">
          Min RR
          <input type="number" step="0.5" min="0" value={filters.min_rr}
            onChange={(e) => set('min_rr', Number(e.target.value) || 0)}
            className="num w-14 rounded-btn border border-border-subtle bg-bg-primary px-2 py-1 outline-none focus:border-tp" />
        </label>
        <label className="flex items-center gap-1 text-txt-muted">
          Min Conf %
          <input type="number" step="5" min="0" max="100" value={Math.round(filters.min_confidence * 100)}
            onChange={(e) => set('min_confidence', (Number(e.target.value) || 0) / 100)}
            className="num w-14 rounded-btn border border-border-subtle bg-bg-primary px-2 py-1 outline-none focus:border-tp" />
        </label>
        <span className="ml-auto text-txt-muted">{state === 'ok' ? `${rows.length} instrumen` : ''}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {state === 'loading' ? (
          <LoadingSkeleton rows={8} />
        ) : state === 'error' ? (
          <p className="text-xs text-sl">Gagal memuat screener. Pastikan engine analisa berjalan.</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-txt-muted">Tidak ada instrumen yang cocok dengan filter.</p>
        ) : (
          <table className="num w-full text-xs">
            <thead className="sticky top-0 bg-bg-primary text-left text-txt-muted">
              <tr className="[&>th]:py-2 [&>th]:font-medium">
                <th>Instrumen</th><th>Harga</th><th>%</th><th>Arah</th><th>Conf</th><th>RR</th>
                <th>Entry</th><th>TP</th><th>SL</th><th>RSI</th><th>MA</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.instrument.symbol} className="border-t border-border-subtle hover:bg-bg-elevated">
                  <td className="py-1.5">
                    <span className="font-semibold">{r.instrument.symbol}</span>
                    <span className="ml-1 text-[10px] uppercase text-txt-muted">{r.instrument.asset_class}</span>
                  </td>
                  <td>{fmtPrice(r.price, r.instrument.precision)}</td>
                  <td className={r.change_pct >= 0 ? 'text-buy' : 'text-sl'}>{r.change_pct >= 0 ? '+' : ''}{r.change_pct.toFixed(2)}%</td>
                  <td><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIR_STYLE[r.direction]}`}>{DIR_LABEL[r.direction]}</span></td>
                  <td>{Math.round(r.confidence * 100)}%</td>
                  <td>{r.risk_reward ? `1:${r.risk_reward.toFixed(1)}` : '—'}</td>
                  <td>{fmtPrice(r.entry, r.instrument.precision)}</td>
                  <td className="text-tp">{fmtPrice(r.take_profit, r.instrument.precision)}</td>
                  <td className="text-sl">{fmtPrice(r.stop_loss, r.instrument.precision)}</td>
                  <td>{r.rsi?.toFixed(0) ?? '—'}</td>
                  <td className={r.ma_state === 'bullish' ? 'text-buy' : r.ma_state === 'bearish' ? 'text-sl' : 'text-txt-muted'}>{r.ma_state}</td>
                  <td><button onClick={() => open(r.instrument.symbol)} className="text-tp hover:underline">Buka →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="border-t border-border-subtle px-3 py-2 text-[10px] text-txt-muted">
        Screener bersifat indikatif — bukan rekomendasi. Selalu konfirmasi setup di chart sebelum mengambil keputusan.
      </p>
    </div>
  )
}
