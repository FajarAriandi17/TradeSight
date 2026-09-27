import { useChartStore } from '../../stores/useChartStore'
import { useUserStore } from '../../stores/useUserStore'
import { fmtPrice, fmtTime } from '../../services/format'
import { LoadingSkeleton } from '../common/LoadingSkeleton'
import { IndicatorToggle } from '../chart/IndicatorToggle'
import type { IndicatorSummary } from '../../services/types'

function Row({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-xs text-txt-muted">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-right">
        <span className="num text-sm font-medium" style={{ color }}>{value}</span>
        {sub && <span className="num ml-1.5 text-[10px] text-txt-muted">{sub}</span>}
      </span>
    </div>
  )
}

function Gauge({ label, value, min, max, state, display }: { label: string; value: number | null; min: number; max: number; state: string; display: string }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const color = state === 'bullish' || state === 'oversold' ? 'var(--accent-buy)' : state === 'bearish' || state === 'overbought' ? 'var(--accent-sl)' : 'var(--text-muted)'
  return (
    <div className="py-1.5">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-txt-muted">{label}</span>
        <span className="num" style={{ color }}>{display} <span className="text-[10px] uppercase">{state}</span></span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-bg-elevated">
        <div className="h-full rounded transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function IndicatorPanel({ s, prec }: { s: IndicatorSummary; prec: number }) {
  const macdRange = Math.max(Math.abs(s.macd_hist ?? 0) * 3, 1e-9)
  return (
    <div id="indicator-panel">
      <Gauge label="RSI (14)" value={s.rsi} min={0} max={100} state={s.rsi_state} display={s.rsi?.toFixed(1) ?? '—'} />
      <Gauge label="MACD Hist" value={s.macd_hist} min={-macdRange} max={macdRange} state={s.macd_state}
        display={s.macd_hist !== null ? s.macd_hist.toFixed(Math.max(prec, 2)) : '—'} />
      <div className="flex justify-between py-1.5 text-xs">
        <span className="text-txt-muted">MA20 / MA50</span>
        <span className={`num ${s.ma_state === 'bullish' ? 'text-buy' : s.ma_state === 'bearish' ? 'text-sl' : 'text-txt-muted'}`}>
          {fmtPrice(s.ma_fast, prec)} / {fmtPrice(s.ma_slow, prec)}
        </span>
      </div>
    </div>
  )
}

export function SignalCard() {
  const analysis = useChartStore((s) => s.analysis)
  const loadState = useChartStore((s) => s.loadState)
  const openPaywall = useUserStore((s) => s.openPaywall)
  const plan = useUserStore((s) => s.plan)

  const sig = analysis?.signal
  const prec = analysis?.instrument.precision ?? 2
  const state = !sig || sig.direction === 'none' ? 'no-signal' : sig.status

  return (
    <aside id="signal-panel" className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-l border-border-subtle bg-bg-surface">
      <section className="border-b border-border-subtle p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-txt-muted">Sinyal Teknikal</h3>
          {sig && sig.direction !== 'none' && (
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${sig.direction === 'buy' ? 'bg-buy/15 text-buy' : 'bg-sl/15 text-sl'}`}>
              {sig.direction === 'buy' ? 'SETUP BUY' : 'SETUP SELL'}
            </span>
          )}
        </div>

        {loadState === 'loading' || !analysis ? (
          <LoadingSkeleton rows={4} />
        ) : state === 'no-signal' ? (
          <div className="signal-card--no-signal rounded-card border border-border-subtle bg-bg-elevated p-3 text-xs text-txt-muted">
            <p className="mb-1 font-medium text-txt-primary">Belum ada setup</p>
            {sig?.reasons.map((r, i) => <p key={i}>• {r}</p>)}
          </div>
        ) : (
          <div className="signal-card--active anim-draw">
            <Row label="Entry" value={fmtPrice(sig!.entry, prec)} color="var(--accent-buy)" />
            <Row label="Take Profit" value={fmtPrice(sig!.take_profit, prec)} color="var(--accent-tp)" sub={`RR 1:${sig!.risk_reward?.toFixed(2)}`} />
            <Row label="Stop Loss" value={fmtPrice(sig!.stop_loss, prec)} color="var(--accent-sl)" />
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[10px] text-txt-muted">
                <span>Kekuatan konfluensi</span>
                <span className="num">{Math.round(sig!.confidence * 100)}%</span>
              </div>
              <div className="h-1.5 rounded bg-bg-elevated">
                <div className="h-full rounded bg-tp transition-all duration-300" style={{ width: `${sig!.confidence * 100}%` }} />
              </div>
            </div>
            <details className="mt-2 text-xs text-txt-muted" open>
              <summary className="cursor-pointer text-txt-primary">Kenapa sinyal ini?</summary>
              <ul className="mt-1 space-y-0.5">
                {sig!.reasons.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </details>
            <p className="mt-2 text-[10px] text-txt-muted">Dihitung: {fmtTime(sig!.generated_at)}</p>
          </div>
        )}
        {sig && (
          <p id="signal-disclaimer" className="mt-3 rounded-btn border border-yellow-500/20 bg-yellow-500/5 p-2 text-[10px] leading-snug text-yellow-300/90">
            ⚠ {sig.disclaimer}
          </p>
        )}
      </section>

      <section className="border-b border-border-subtle p-3">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-txt-muted">Indikator</h3>
        {analysis ? <IndicatorPanel s={analysis.summary} prec={prec} /> : <LoadingSkeleton rows={3} />}
      </section>

      <section className="border-b border-border-subtle p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-txt-muted">Tampilkan di Chart</h3>
        <IndicatorToggle />
      </section>

      <section className="p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-txt-muted">Level S/R</h3>
        <ul className="num space-y-1 text-xs">
          {[...(analysis?.levels ?? [])].reverse().map((l) => (
            <li key={l.price} className="flex justify-between">
              <span className={l.kind === 'support' ? 'text-buy' : 'text-sl'}>{l.kind === 'support' ? 'Support' : 'Resistance'}</span>
              <span>{fmtPrice(l.price, prec)} <span className="text-txt-muted">×{l.touches}</span></span>
            </li>
          ))}
        </ul>
        {plan === 'free' && (
          <button onClick={() => openPaywall('Multi-timeframe, notifikasi & watchlist unlimited.')}
            className="mt-4 w-full rounded-btn bg-gradient-to-r from-tp to-buy py-2 text-xs font-semibold text-white hover:brightness-110">
            ✦ Upgrade ke Premium
          </button>
        )}
      </section>
    </aside>
  )
}
