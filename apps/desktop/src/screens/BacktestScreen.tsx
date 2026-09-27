import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { fmtPrice, fmtTime } from '../services/format'
import { useChartStore } from '../stores/useChartStore'
import { useUserStore } from '../stores/useUserStore'
import { LoadingSkeleton } from '../components/common/LoadingSkeleton'
import type { BacktestResult, Timeframe } from '../services/types'

const TFS: Timeframe[] = ['15m', '1h', '4h', '1d']

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'buy' | 'sl' | '' }) {
  const color = tone === 'buy' ? 'text-buy' : tone === 'sl' ? 'text-sl' : 'text-txt-primary'
  return (
    <div className="rounded-card border border-border-subtle bg-bg-surface p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-txt-muted">{label}</div>
      <div className={`num mt-1 text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}

/** Backtest walk-forward pada data historis (PRD Fase 2, premium). */
export function BacktestScreen() {
  const symbol = useChartStore((s) => s.symbol)
  const instruments = useChartStore((s) => s.instruments)
  const setSymbol = useChartStore((s) => s.setSymbol)
  const plan = useUserStore((s) => s.plan)
  const openPaywall = useUserStore((s) => s.openPaywall)

  const [timeframe, setTimeframe] = useState<Timeframe>('1h')
  const [data, setData] = useState<BacktestResult | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (plan !== 'premium') return
    const ctrl = new AbortController()
    setState('loading')
    api
      .backtest(symbol, timeframe, ctrl.signal)
      .then((d) => { setData(d); setState('ok') })
      .catch(() => setState('error'))
    return () => ctrl.abort()
  }, [symbol, timeframe, plan])

  if (plan === 'free') {
    return (
      <div className="anim-screen flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-card border border-border-subtle bg-bg-surface p-8 text-center">
          <div className="mb-3 text-3xl">⏳</div>
          <h2 className="mb-2 text-lg font-bold">Backtest Historis</h2>
          <p className="mb-4 text-sm text-txt-muted">
            Uji strategi sinyal pada data masa lalu — lihat win rate, expectancy, dan profit factor
            sebelum menerapkannya secara live.
          </p>
          <button
            onClick={() => openPaywall('Backtest historis tersedia di Premium.')}
            className="w-full rounded-btn bg-gradient-to-r from-tp to-buy py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            ✦ Buka Backtest di Premium
          </button>
        </div>
      </div>
    )
  }

  const prec = data?.instrument.precision ?? 2

  return (
    <div id="backtest-screen" className="anim-screen flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-bg-surface p-3 text-xs">
        <h2 className="mr-2 text-sm font-bold">Backtest</h2>
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)}
          className="rounded-btn border border-border-subtle bg-bg-primary px-2 py-1 outline-none focus:border-tp">
          {instruments.map((i) => <option key={i.symbol} value={i.symbol}>{i.symbol} · {i.name}</option>)}
        </select>
        <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as Timeframe)}
          className="rounded-btn border border-border-subtle bg-bg-primary px-2 py-1 outline-none focus:border-tp">
          {TFS.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
        {data && <span className="ml-auto text-txt-muted">{data.bars} bar · sumber {data.source}</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {state === 'loading' ? (
          <LoadingSkeleton rows={8} />
        ) : state === 'error' || !data ? (
          <p className="text-xs text-sl">Gagal menjalankan backtest. Pastikan engine analisa berjalan.</p>
        ) : data.trades === 0 ? (
          <p className="text-xs text-txt-muted">Tidak ada setup yang terbentuk pada rentang data ini.</p>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              <Stat label="Trade" value={String(data.trades)} />
              <Stat label="Win Rate" value={`${Math.round(data.win_rate * 100)}%`} tone={data.win_rate >= 0.5 ? 'buy' : 'sl'} />
              <Stat label="Total R" value={`${data.total_r >= 0 ? '+' : ''}${data.total_r.toFixed(1)}R`} tone={data.total_r >= 0 ? 'buy' : 'sl'} />
              <Stat label="Expectancy" value={`${data.expectancy_r >= 0 ? '+' : ''}${data.expectancy_r.toFixed(2)}R`} tone={data.expectancy_r >= 0 ? 'buy' : 'sl'} />
              <Stat label="Profit Factor" value={data.profit_factor.toFixed(2)} tone={data.profit_factor >= 1 ? 'buy' : 'sl'} />
              <Stat label="Avg RR" value={`1:${data.avg_rr.toFixed(1)}`} />
            </div>
            <div className="mb-3 text-[11px] text-txt-muted">
              {data.wins} menang · {data.losses} kalah{data.open_trades > 0 ? ` · ${data.open_trades} masih terbuka di ujung data` : ''}
            </div>

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-txt-muted">Riwayat Trade (maks 50 terakhir)</h3>
            <table className="num w-full text-xs">
              <thead className="text-left text-txt-muted">
                <tr className="[&>th]:py-1.5 [&>th]:font-medium">
                  <th>Dibuka</th><th>Arah</th><th>Entry</th><th>TP</th><th>SL</th><th>RR</th><th>Ditutup</th><th>Exit</th><th>Hasil</th><th>R</th>
                </tr>
              </thead>
              <tbody>
                {data.trade_list.map((t, i) => (
                  <tr key={i} className="border-t border-border-subtle">
                    <td className="py-1">{fmtTime(t.opened_at)}</td>
                    <td className={t.direction === 'buy' ? 'text-buy' : 'text-sl'}>{t.direction.toUpperCase()}</td>
                    <td>{fmtPrice(t.entry, prec)}</td>
                    <td className="text-tp">{fmtPrice(t.take_profit, prec)}</td>
                    <td className="text-sl">{fmtPrice(t.stop_loss, prec)}</td>
                    <td>1:{t.risk_reward.toFixed(1)}</td>
                    <td>{t.closed_at ? fmtTime(t.closed_at) : '—'}</td>
                    <td>{t.exit_price != null ? fmtPrice(t.exit_price, prec) : '—'}</td>
                    <td className={t.outcome === 'win' ? 'text-buy' : t.outcome === 'loss' ? 'text-sl' : 'text-txt-muted'}>
                      {t.outcome === 'win' ? 'WIN' : t.outcome === 'loss' ? 'LOSS' : 'OPEN'}
                    </td>
                    <td className={t.r_multiple >= 0 ? 'text-buy' : 'text-sl'}>{t.r_multiple >= 0 ? '+' : ''}{t.r_multiple.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[10px] leading-snug text-txt-muted">⚠ {data.disclaimer}</p>
          </>
        )}
      </div>
    </div>
  )
}
