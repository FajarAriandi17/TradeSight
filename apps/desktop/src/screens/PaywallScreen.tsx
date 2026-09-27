import { useState } from 'react'
import { Modal } from '../components/common/Modal'
import { Button } from '../components/common/Button'
import { useUserStore } from '../stores/useUserStore'

const FEATURES: [string, string, string][] = [
  ['Watchlist', '5 instrumen', 'Unlimited'],
  ['Sinyal Entry/TP/SL', 'Dasar', 'Semua instrumen'],
  ['Timeframe', '1H & Daily', '15m, 1H, 4H, Daily'],
  ['Notifikasi desktop', '—', '✓'],
  ['Riwayat sinyal', '3 terakhir', 'Lengkap'],
  ['Data', 'Delay', 'Lebih realtime'],
]

/** PaywallModal — upsell free → premium (F8). Payment gateway (Midtrans) diaktifkan di Fase 3. */
export function PaywallScreen() {
  const { paywallOpen, paywallReason, closePaywall, activateLicense } = useUserStore()
  const [key, setKey] = useState('')
  const [err, setErr] = useState('')

  const submit = () => {
    if (activateLicense(key)) { setKey(''); setErr('') }
    else setErr('Kode lisensi tidak valid.')
  }

  return (
    <Modal open={paywallOpen} onClose={closePaywall} width={560}>
      <div id="paywall-modal">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-tp">TradeSight Premium</div>
        <h2 className="mb-1 text-xl font-bold">Buka analisa tanpa batas</h2>
        {paywallReason && <p className="mb-4 text-sm text-txt-muted">{paywallReason}</p>}

        <table className="mb-5 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-txt-muted">
              <th className="pb-2 font-medium">Fitur</th><th className="pb-2 font-medium">Gratis</th><th className="pb-2 font-medium text-tp">Premium</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map(([f, a, b]) => (
              <tr key={f} className="border-t border-border-subtle">
                <td className="py-2">{f}</td><td className="py-2 text-txt-muted">{a}</td><td className="py-2 font-medium text-buy">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-4 flex items-end justify-between rounded-card border border-tp/30 bg-tp/5 p-4">
          <div>
            <div className="text-xs text-txt-muted">Mulai dari</div>
            <div className="num text-2xl font-bold">Rp 99.000<span className="text-sm font-normal text-txt-muted">/bulan</span></div>
          </div>
          <Button onClick={() => alert('Pembayaran online (Midtrans) akan segera tersedia. Hubungi tim TradeSight untuk kode lisensi.')}>
            Upgrade Sekarang
          </Button>
        </div>

        <div className="flex gap-2">
          <input
            id="license-input"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Punya kode lisensi? TS-XXXX-XXXX-XXXX"
            className="num flex-1 rounded-btn border border-border-subtle bg-bg-primary px-3 py-2 text-xs uppercase outline-none focus:border-tp"
          />
          <Button variant="outline" onClick={submit}>Aktifkan</Button>
        </div>
        {err && <p className="mt-2 text-xs text-sl">{err}</p>}
        <p className="mt-3 text-[10px] text-txt-muted">Harga placeholder — akan difinalisasi setelah riset kompetitor.</p>
      </div>
    </Modal>
  )
}
