import { useState } from 'react'
import { Button } from '../components/common/Button'
import { useUserStore } from '../stores/useUserStore'

const SLIDES = [
  {
    icon: '📈',
    title: 'Selamat datang di TradeSight',
    body: 'Chart realtime forex & saham IDX dalam satu layar — dengan support/resistance yang terdeteksi otomatis.',
  },
  {
    icon: '🎯',
    title: 'Entry, TP & SL dalam hitungan detik',
    body: 'Engine analisa menggabungkan MA, RSI, MACD dan level S/R untuk menyusun setup dengan risk-reward minimal 1:2 — lengkap dengan alasan "kenapa".',
  },
  {
    icon: '⚠️',
    title: 'Disclaimer Risiko (wajib dibaca)',
    body: '',
  },
]

export function OnboardingScreen() {
  const [i, setI] = useState(0)
  const [agree, setAgree] = useState(false)
  const complete = useUserStore((s) => s.completeOnboarding)
  const last = i === SLIDES.length - 1

  return (
    <div id="onboarding-screen" className="anim-screen flex h-full items-center justify-center bg-bg-primary p-6">
      <div className="w-[560px] max-w-full overflow-hidden rounded-card border border-border-subtle bg-bg-surface shadow-2xl">
        <div className="overflow-hidden">
          <div className="slide-track flex" style={{ transform: `translateX(-${i * 100}%)` }}>
            {SLIDES.map((s, idx) => (
              <div key={idx} className="w-full shrink-0 p-8">
                <div className="mb-4 text-5xl">{s.icon}</div>
                <h1 className="mb-3 text-xl font-bold">{s.title}</h1>
                {idx < 2 ? (
                  <p className="text-sm leading-relaxed text-txt-muted">{s.body}</p>
                ) : (
                  <div className="space-y-2 text-xs leading-relaxed text-txt-muted">
                    <p>• TradeSight adalah <b className="text-txt-primary">alat bantu analisa teknikal</b>, bukan penyedia rekomendasi investasi berlisensi OJK.</p>
                    <p>• Sinyal entry/TP/SL dihasilkan otomatis dari indikator dan <b className="text-txt-primary">tidak menjamin keuntungan</b>.</p>
                    <p>• Trading forex & saham mengandung <b className="text-sl">risiko kerugian</b>, termasuk kehilangan seluruh modal.</p>
                    <p>• Data pasar dapat tertunda (saham IDX ±15 menit) atau tidak akurat. Selalu verifikasi di platform broker Anda.</p>
                    <p>• Keputusan akhir sepenuhnya menjadi tanggung jawab pengguna.</p>
                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-txt-primary">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="accent-[#3B82F6]" />
                      Saya telah membaca dan memahami risiko di atas.
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border-subtle px-8 py-4">
          <div className="flex gap-1.5">
            {SLIDES.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === i ? 'w-6 bg-tp' : 'w-1.5 bg-border-subtle'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && <Button variant="ghost" onClick={() => setI(i - 1)}>Kembali</Button>}
            {!last ? (
              <Button onClick={() => setI(i + 1)}>Lanjut</Button>
            ) : (
              <Button id="onboarding-accept" disabled={!agree} onClick={complete}>Saya Mengerti</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
