import { fmtPrice, fmtTime } from '../services/format'
import { useChartStore } from '../stores/useChartStore'
import { useUserStore } from '../stores/useUserStore'
import { computeStats, useJournalStore } from '../stores/useJournalStore'

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'buy' | 'sl' | '' }) {
  const color = tone === 'buy' ? 'text-buy' : tone === 'sl' ? 'text-sl' : 'text-txt-primary'
  return (
    <div className="rounded-card border border-border-subtle bg-bg-surface p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-txt-muted">{label}</div>
      <div className={`num mt-1 text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-bg-elevated text-txt-muted',
  win: 'bg-buy/15 text-buy',
  loss: 'bg-sl/15 text-sl',
  closed: 'bg-tp/15 text-tp',
}
const STATUS_LABEL: Record<string, string> = { open: 'TERBUKA', win: 'WIN', loss: 'LOSS', closed: 'DITUTUP' }

/** Jurnal trading otomatis — trade yang diikuti dari sinyal, dievaluasi live (PRD Fase 2, premium). */
export function JournalScreen() {
  const plan = useUserStore((s) => s.plan)
  const openPaywall = useUserStore((s) => s.openPaywall)
  const trades = useJournalStore((s) => s.trades)
  const closeManual = useJournalStore((s) => s.closeManual)
  const remove = useJournalStore((s) => s.remove)
  const clearClosed = useJournalStore((s) => s.clearClosed)
  const analysis = useChartStore((s) => s.analysis)
  const symbol = useChartStore((s) => s.symbol)

  const stats = computeStats(trades)

  if (plan === 'free') {
    return (
      <div className="anim-screen flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-card border border-border-subtle bg-bg-surface p-8 text-center">
          <div className="mb-3 text-3xl">📓</div>
          <h2 className="mb-2 text-lg font-bold">Jurnal Trading</h2>
          <p className="mb-4 text-sm text-txt-muted">
            Ikuti sinyal langsung dari kartu sinyal, dan biarkan TradeSight memantau TP/SL otomatis.
            Lihat win rate &amp; expectancy dari keputusanmu sendiri.
          </p>
          <button
            onClick={() => openPaywall('Jurnal trading otomatis tersedia di Premium.')}
            className="w-full rounded-btn bg-gradient-to-r from-tp to-buy py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            ✦ Buka Jurnal di Premium
          </button>
        </div>
      </div>
    )
  }

  const livePrice = (s: string) =>
    analysis?.instrument.symbol === s ? analysis.candles[analysis.candles.length - 1]?.close ?? null : null

  return (
    <div id="journal-screen" className="anim-screen flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border-subtle bg-bg-surface p-3">
        <h2 className="text-sm font-bold">Jurnal Trading</h2>
        {trades.some((t) => t.status !== 'open') && (
          <button onClick={clearClosed} className="ml-auto text-xs text-txt-muted hover:text-txt-primary">
            Bersihkan yang selesai
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total" value={String(stats.total)} />
          <Stat label="Terbuka" value={String(stats.open)} />
          <Stat label="Win Rate" value={`${Math.round(stats.winRate * 100)}%`} tone={stats.winRate >= 0.5 ? 'buy' : 'sl'} />
          <Stat label="Total R" value={`${stats.totalR >= 0 ? '+' : ''}${stats.totalR.toFixed(1)}R`} tone={stats.totalR >= 0 ? 'buy' : 'sl'} />
          <Stat label="Expectancy" value={`${stats.expectancyR >= 0 ? '+' : ''}${stats.expectancyR.toFixed(2)}R`} tone={stats.expectancyR >= 0 ? 'buy' : 'sl'} />
          <Stat label="Profit Factor" value={stats.profitFactor.toFixed(2)} tone={stats.profitFactor >= 1 ? 'buy' : 'sl'} />
        </div>

        {trades.length === 0 ? (
          <div className="rounded-card border border-border-subtle bg-bg-surface p-6 text-center text-xs text-txt-muted">
            <p className="mb-1 font-medium text-txt-primary">Belum ada trade di jurnal</p>
            <p>Tekan “+ Ikuti ke Jurnal” pada kartu sinyal untuk mulai memantau setup secara otomatis.</p>
          </div>
        ) : (
          <table className="num w-full text-xs">
            <thead className="text-left text-txt-muted">
              <tr className="[&>th]:py-1.5 [&>th]:font-medium">
                <th>Instrumen</th><th>TF</th><th>Arah</th><th>Entry</th><th>TP</th><th>SL</th><th>RR</th>
                <th>Dibuka</th><th>Status</th><th>Exit</th><th>R</th><th></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const prec = t.symbol === symbol ? (analysis?.instrument.precision ?? 2) : 2
                const lp = livePrice(t.symbol)
                return (
                  <tr key={t.id} className="border-t border-border-subtle hover:bg-bg-elevated">
                    <td className="py-1.5 font-semibold">{t.symbol}</td>
                    <td>{t.timeframe}</td>
                    <td className={t.direction === 'buy' ? 'text-buy' : 'text-sl'}>{t.direction.toUpperCase()}</td>
                    <td>{fmtPrice(t.entry, prec)}</td>
                    <td className="text-tp">{fmtPrice(t.take_profit, prec)}</td>
                    <td className="text-sl">{fmtPrice(t.stop_loss, prec)}</td>
                    <td>1:{t.risk_reward.toFixed(1)}</td>
                    <td>{fmtTime(t.openedAt)}</td>
                    <td><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLE[t.status]}`}>{STATUS_LABEL[t.status]}</span></td>
                    <td>{t.exitPrice != null ? fmtPrice(t.exitPrice, prec) : '—'}</td>
                    <td className={t.r_multiple >= 0 ? 'text-buy' : 'text-sl'}>{t.status === 'open' ? '—' : `${t.r_multiple >= 0 ? '+' : ''}${t.r_multiple.toFixed(2)}`}</td>
                    <td className="text-right">
                      {t.status === 'open' && lp != null && (
                        <button onClick={() => closeManual(t.id, lp)} className="mr-2 text-txt-muted hover:text-txt-primary" title="Tutup di harga live">
                          Tutup @{fmtPrice(lp, prec)}
                        </button>
                      )}
                      <button onClick={() => remove(t.id)} className="text-sl/70 hover:text-sl" title="Hapus dari jurnal">✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="border-t border-border-subtle px-3 py-2 text-[10px] text-txt-muted">
        Jurnal mengevaluasi TP/SL dari harga live yang diterima app — bukan simulasi eksekusi broker. Untuk edukasi &amp; disiplin, bukan rekomendasi.
      </p>
    </div>
  )
}
