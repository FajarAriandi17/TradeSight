import { useMemo, useState } from 'react'
import { useChartStore } from '../../stores/useChartStore'
import { useUserStore } from '../../stores/useUserStore'
import { useWatchlistStore } from '../../stores/useWatchlistStore'

export function TopBar() {
  const { instruments, setSymbol, conn, source } = useChartStore()
  const { plan, screen, setScreen } = useUserStore()
  const add = useWatchlistStore((s) => s.add)
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    return instruments.filter((i) => i.symbol.toLowerCase().includes(t) || i.name.toLowerCase().includes(t)).slice(0, 8)
  }, [q, instruments])

  const connColor = conn === 'live' ? 'bg-buy' : conn === 'connecting' ? 'bg-yellow-400' : 'bg-sl'
  const connText = conn === 'live' ? 'Live' : conn === 'connecting' ? 'Menghubungkan…' : 'Offline'

  return (
    <header id="top-bar" className="flex h-12 shrink-0 items-center gap-4 border-b border-border-subtle bg-bg-surface px-4">
      <button onClick={() => setScreen('dashboard')} className="flex items-center gap-2">
        <img src="/icon.png" alt="" className="h-6 w-6 rounded" />
        <span className="text-sm font-bold tracking-tight">Trade<span className="text-tp">Sight</span></span>
      </button>

      <div className="relative w-72">
        <input
          id="instrument-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          placeholder="Cari instrumen (EURUSD, BBCA…)"
          className="w-full rounded-btn border border-border-subtle bg-bg-primary px-3 py-1.5 text-xs outline-none placeholder:text-txt-muted focus:border-tp"
        />
        {focus && results.length > 0 && (
          <ul className="anim-modal absolute left-0 right-0 top-9 z-40 rounded-card border border-border-subtle bg-bg-surface p-1 shadow-xl">
            {results.map((i) => (
              <li key={i.symbol}>
                <button
                  onMouseDown={() => { setSymbol(i.symbol); add(i.symbol); setQ(''); setScreen('dashboard') }}
                  className="flex w-full justify-between rounded-btn px-2 py-1.5 text-left text-xs hover:bg-bg-elevated"
                >
                  <span className="font-medium">{i.symbol} <span className="text-txt-muted">{i.name}</span></span>
                  <span className="uppercase text-txt-muted">{i.asset_class}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div id="connection-status" className="flex items-center gap-2 text-xs text-txt-muted" title={`Sumber: ${source}`}>
          <span className={`h-2 w-2 rounded-full ${connColor} ${conn === 'live' ? 'animate-pulse' : ''}`} />
          {connText}
          {source && <span className="hidden rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] lg:inline">{source}</span>}
        </div>
        <button
          onClick={() => setScreen(screen === 'detail' ? 'dashboard' : 'detail')}
          className="text-xs text-txt-muted hover:text-txt-primary"
          title="Chart fullscreen"
        >
          {screen === 'detail' ? '⤡ Dashboard' : '⤢ Detail'}
        </button>
        <button
          id="avatar-btn"
          onClick={() => setScreen(screen === 'settings' ? 'dashboard' : 'settings')}
          className="flex items-center gap-2 rounded-full border border-border-subtle py-0.5 pl-0.5 pr-2.5 hover:bg-bg-elevated"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tp text-[11px] font-bold text-white">T</span>
          <span className={`text-[10px] font-semibold uppercase ${plan === 'premium' ? 'text-yellow-400' : 'text-txt-muted'}`}>{plan}</span>
        </button>
      </div>
    </header>
  )
}
