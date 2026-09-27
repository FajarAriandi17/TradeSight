import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { fmtPrice } from '../../services/format'
import { useChartStore } from '../../stores/useChartStore'
import { useUserStore } from '../../stores/useUserStore'
import { LoadingSkeleton } from '../common/LoadingSkeleton'
import type { MtfResult } from '../../services/types'

const DIR_STYLE: Record<string, string> = {
  buy: 'bg-buy/15 text-buy',
  sell: 'bg-sl/15 text-sl',
  none: 'bg-bg-elevated text-txt-muted',
}
const DIR_LABEL: Record<string, string> = { buy: 'BUY', sell: 'SELL', none: '—' }

/** Analisa multi-timeframe (15m/1h/4h/1d) dalam satu panel — Fase 2, premium. */
export function MtfPanel() {
  const symbol = useChartStore((s) => s.symbol)
  const prec = useChartStore((s) => s.analysis?.instrument.precision ?? 2)
  const plan = useUserStore((s) => s.plan)
  const openPaywall = useUserStore((s) => s.openPaywall)
  const [data, setData] = useState<MtfResult | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (plan !== 'premium') return
    const ctrl = new AbortController()
    setState('loading')
    api
      .mtf(symbol, ctrl.signal)
      .then((d) => { setData(d); setState('ok') })
      .catch(() => setState('error'))
    return () => ctrl.abort()
  }, [symbol, plan])

  return (
    <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-l border-border-subtle bg-bg-surface p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-txt-muted">
        Multi-Timeframe · {symbol}
      </h3>

      {plan === 'free' ? (
        <div className="rounded-card border border-border-subtle bg-bg-elevated p-4 text-center text-xs text-txt-muted">
          <p className="mb-2 font-medium text-txt-primary">Analisa 15m · 1H · 4H · Daily sekaligus</p>
          <p className="mb-3">Lihat keselarasan tren lintas timeframe untuk konfirmasi setup.</p>
          <button
            onClick={() => openPaywall('Analisa multi-timeframe tersedia di Premium.')}
            className="w-full rounded-btn bg-gradient-to-r from-tp to-buy py-2 text-xs font-semibold text-white hover:brightness-110"
          >
            ✦ Buka di Premium
          </button>
        </div>
      ) : state === 'loading' ? (
        <LoadingSkeleton rows={5} />
      ) : state === 'error' || !data ? (
        <p className="text-xs text-sl">Gagal memuat analisa multi-timeframe.</p>
      ) : (
        <>
          <div className={`mb-3 rounded-card p-3 text-center ${DIR_STYLE[data.bias]}`}>
            <div className="text-[10px] uppercase tracking-wider opacity-80">Bias Konfluensi</div>
            <div className="num text-lg font-bold">{DIR_LABEL[data.bias]}</div>
            <div className="text-[10px] opacity-80">Keselarasan {Math.round(data.agreement * 100)}%</div>
          </div>
          <ul className="space-y-1.5">
            {data.frames.map((f) => (
              <li key={f.timeframe} className="rounded-btn border border-border-subtle bg-bg-primary p-2">
                <div className="flex items-center justify-between">
                  <span className="num text-xs font-semibold">{f.timeframe.toUpperCase()}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIR_STYLE[f.signal.direction]}`}>
                    {DIR_LABEL[f.signal.direction]}
                  </span>
                </div>
                <div className="num mt-1 flex justify-between text-[10px] text-txt-muted">
                  <span>RSI {f.summary.rsi?.toFixed(0) ?? '—'}</span>
                  <span className={f.summary.ma_state === 'bullish' ? 'text-buy' : f.summary.ma_state === 'bearish' ? 'text-sl' : ''}>MA {f.summary.ma_state}</span>
                  {f.signal.direction !== 'none' && <span>1:{f.signal.risk_reward?.toFixed(1)}</span>}
                </div>
                {f.signal.direction !== 'none' && (
                  <div className="num mt-0.5 text-[10px] text-txt-muted">
                    Entry {fmtPrice(f.signal.entry, prec)} · TP {fmtPrice(f.signal.take_profit, prec)}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] leading-snug text-txt-muted">
            Bias = arah mayoritas timeframe. Setup makin kuat bila timeframe besar (4H/D) searah.
          </p>
        </>
      )}
    </aside>
  )
}
