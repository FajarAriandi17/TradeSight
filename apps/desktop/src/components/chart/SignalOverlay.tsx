import { useEffect, useRef, useState } from 'react'
import { LineStyle, type IPriceLine, type ISeriesApi } from 'lightweight-charts'
import { useChartStore } from '../../stores/useChartStore'
import { fmtPrice } from '../../services/format'

/**
 * Menggambar overlay di chart: garis S/R, serta garis Entry/TP/SL + zona profit/risk.
 * Legend kecil di pojok kiri atas memakai animasi "draw" (PRD §11).
 */
export function SignalOverlay({ series }: { series?: ISeriesApi<'Candlestick'> }) {
  const analysis = useChartStore((s) => s.analysis)
  const indicators = useChartStore((s) => s.indicators)
  const lines = useRef<IPriceLine[]>([])
  const [animKey, setAnimKey] = useState(0)

  const sig = analysis?.signal
  const levels = analysis?.levels ?? []
  const prec = analysis?.instrument.precision ?? 2
  const sigKey = `${sig?.direction}-${sig?.entry}-${sig?.take_profit}-${sig?.stop_loss}`
  const lvlKey = levels.map((l) => l.price.toFixed(6)).join('|')

  useEffect(() => {
    if (!series) return
    lines.current.forEach((l) => series.removePriceLine(l))
    lines.current = []
    if (indicators.sr) {
      levels.forEach((l) => {
        lines.current.push(
          series.createPriceLine({
            price: l.price,
            color: l.kind === 'support' ? '#22C55E99' : '#EF444499',
            lineWidth: l.strength > 0.6 ? 2 : 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `${l.kind === 'support' ? 'S' : 'R'}${l.touches > 1 ? ` ×${l.touches}` : ''}`,
          }),
        )
      })
    }
    if (indicators.signal && sig && sig.direction !== 'none' && sig.entry && sig.take_profit && sig.stop_loss) {
      const mk = (price: number, color: string, title: string) =>
        lines.current.push(series.createPriceLine({ price, color, lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: true, title }))
      mk(sig.entry, '#22C55E', `ENTRY ${sig.direction.toUpperCase()}`)
      mk(sig.take_profit, '#3B82F6', `TP (1:${sig.risk_reward?.toFixed(1)})`)
      mk(sig.stop_loss, '#EF4444', 'SL')
    }
    setAnimKey((k) => k + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, sigKey, lvlKey, indicators.sr, indicators.signal])

  if (!indicators.signal || !sig || sig.direction === 'none') return null
  return (
    <div key={animKey} className="anim-draw pointer-events-none absolute left-3 top-3 z-[5] rounded-card border border-border-subtle bg-bg-surface/90 px-3 py-2 text-[11px] backdrop-blur">
      <div className={`mb-1 font-semibold ${sig.direction === 'buy' ? 'text-buy' : 'text-sl'}`}>
        Setup {sig.direction === 'buy' ? 'BUY' : 'SELL'} · RR 1:{sig.risk_reward?.toFixed(2)}
      </div>
      <div className="num grid grid-cols-[auto_auto] gap-x-3 text-txt-muted">
        <span>Entry</span><span className="text-buy">{fmtPrice(sig.entry, prec)}</span>
        <span>TP</span><span className="text-tp">{fmtPrice(sig.take_profit, prec)}</span>
        <span>SL</span><span className="text-sl">{fmtPrice(sig.stop_loss, prec)}</span>
      </div>
    </div>
  )
}
