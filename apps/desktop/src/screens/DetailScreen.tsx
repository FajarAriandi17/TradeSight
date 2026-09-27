import { ChartPanel } from '../components/chart/ChartPanel'
import { MtfPanel } from '../components/chart/MtfPanel'
import { useChartStore } from '../stores/useChartStore'
import { useUserStore } from '../stores/useUserStore'
import { fmtPrice, fmtTime } from '../services/format'

/** Detail Instrumen: chart expanded + riwayat sinyal (PRD §10.2, F7). */
export function DetailScreen({ onRetry }: { onRetry: () => void }) {
  const symbol = useChartStore((s) => s.symbol)
  const history = useChartStore((s) => s.history)
  const prec = useChartStore((s) => s.analysis?.instrument.precision ?? 2)
  const plan = useUserStore((s) => s.plan)
  const openPaywall = useUserStore((s) => s.openPaywall)
  const rows = history.filter((h) => h.symbol === symbol)
  const visible = plan === 'premium' ? rows : rows.slice(0, 3)

  return (
    <div id="detail-screen" className="anim-screen flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <ChartPanel onRetry={onRetry} expanded />
        <MtfPanel />
      </div>
      <section className="h-44 shrink-0 overflow-y-auto border-t border-border-subtle bg-bg-surface p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-txt-muted">Riwayat Sinyal · {symbol}</h3>
        {rows.length === 0 ? (
          <p className="text-xs text-txt-muted">Belum ada sinyal tercatat untuk instrumen ini.</p>
        ) : (
          <table className="num w-full text-xs">
            <thead className="text-left text-txt-muted">
              <tr><th className="py-1">Waktu</th><th>TF</th><th>Arah</th><th>Entry</th><th>TP</th><th>SL</th><th>RR</th></tr>
            </thead>
            <tbody>
              {visible.map((h, i) => (
                <tr key={i} className="border-t border-border-subtle">
                  <td className="py-1">{fmtTime(h.signal.generated_at)}</td>
                  <td>{h.timeframe}</td>
                  <td className={h.signal.direction === 'buy' ? 'text-buy' : 'text-sl'}>{h.signal.direction.toUpperCase()}</td>
                  <td>{fmtPrice(h.signal.entry, prec)}</td>
                  <td className="text-tp">{fmtPrice(h.signal.take_profit, prec)}</td>
                  <td className="text-sl">{fmtPrice(h.signal.stop_loss, prec)}</td>
                  <td>1:{h.signal.risk_reward?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {plan === 'free' && rows.length > 3 && (
          <button onClick={() => openPaywall('Riwayat sinyal lengkap tersedia di Premium.')} className="mt-2 text-xs text-tp hover:underline">
            Lihat {rows.length - 3} sinyal lainnya (Premium) →
          </button>
        )}
      </section>
    </div>
  )
}
