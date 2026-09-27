import { useEffect, useState } from 'react'
import { Button } from '../components/common/Button'
import { useUserStore } from '../stores/useUserStore'
import { api, SIDECAR_URL } from '../services/api'
import { notify } from '../services/notify'

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors duration-150 disabled:opacity-40 ${checked ? 'bg-tp' : 'bg-border-subtle'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-150 ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

export function SettingsScreen() {
  const u = useUserStore()
  const [health, setHealth] = useState<string>('memeriksa…')

  useEffect(() => {
    api.health().then((h) => setHealth(`v${h.version} · ${h.providers.join(' → ')}`)).catch(() => setHealth('tidak terhubung'))
  }, [])

  return (
    <div id="settings-screen" className="anim-screen flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Pengaturan</h1>
          <Button variant="ghost" onClick={() => u.setScreen('dashboard')}>← Kembali ke Dashboard</Button>
        </div>

        <section className="rounded-card border border-border-subtle bg-bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold">Tampilan</h2>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-txt-muted">Mode gelap</span>
            <Toggle checked={u.theme === 'dark'} onChange={(v) => u.setTheme(v ? 'dark' : 'light')} />
          </div>
        </section>

        <section className="rounded-card border border-border-subtle bg-bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold">Notifikasi {u.plan === 'free' && <span className="ml-1 text-[10px] text-yellow-400">PREMIUM</span>}</h2>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-txt-muted">Notifikasi desktop saat sinyal baru / TP / SL tersentuh</span>
            <Toggle
              checked={u.plan === 'premium' && u.notifications}
              onChange={(v) => (u.plan === 'premium' ? u.setNotifications(v) : u.openPaywall('Notifikasi desktop tersedia di Premium.'))}
            />
          </div>
          {u.plan === 'premium' && (
            <Button size="sm" variant="outline" onClick={() => notify('TradeSight', 'Notifikasi berfungsi ✓')}>Tes notifikasi</Button>
          )}
        </section>

        <section className="rounded-card border border-border-subtle bg-bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold">Akun & Langganan</h2>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm">Paket: <b className={u.plan === 'premium' ? 'text-yellow-400' : ''}>{u.plan.toUpperCase()}</b></div>
              {u.licenseKey && <div className="num text-xs text-txt-muted">{u.licenseKey}</div>}
            </div>
            {u.plan === 'free' ? (
              <Button onClick={() => u.openPaywall('')}>Upgrade</Button>
            ) : (
              <Button variant="outline" onClick={u.downgrade}>Logout lisensi</Button>
            )}
          </div>
        </section>

        <section className="rounded-card border border-border-subtle bg-bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold">Sistem</h2>
          <dl className="num grid grid-cols-[140px_1fr] gap-y-2 text-xs">
            <dt className="text-txt-muted">Engine lokal</dt><dd>{SIDECAR_URL}</dd>
            <dt className="text-txt-muted">Status</dt><dd>{health}</dd>
            <dt className="text-txt-muted">Versi app</dt><dd>0.1.0</dd>
          </dl>
          <Button className="mt-4" size="sm" variant="ghost" onClick={u.resetOnboarding}>Tampilkan onboarding & disclaimer lagi</Button>
        </section>
      </div>
    </div>
  )
}
