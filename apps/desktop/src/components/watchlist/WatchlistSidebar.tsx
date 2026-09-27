import { useState } from 'react'
import { useChartStore } from '../../stores/useChartStore'
import { useWatchlistStore } from '../../stores/useWatchlistStore'
import { FREE_WATCHLIST_LIMIT, useUserStore } from '../../stores/useUserStore'
import { WatchlistItem } from './WatchlistItem'
import { Modal } from '../common/Modal'

export function WatchlistSidebar() {
  const { symbols, add, remove } = useWatchlistStore()
  const { instruments, symbol, setSymbol } = useChartStore()
  const plan = useUserStore((s) => s.plan)
  const [adding, setAdding] = useState(false)

  const bySymbol = Object.fromEntries(instruments.map((i) => [i.symbol, i]))
  const available = instruments.filter((i) => !symbols.includes(i.symbol))

  return (
    <aside id="watchlist-sidebar" className="flex w-[240px] shrink-0 flex-col border-r border-border-subtle bg-bg-surface">
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-txt-muted">Watchlist</h3>
        <span className="num text-[10px] text-txt-muted">
          {symbols.length}{plan === 'free' ? `/${FREE_WATCHLIST_LIMIT}` : ''}
        </span>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-1.5">
        {symbols.filter((s) => bySymbol[s]).map((s) => (
          <WatchlistItem
            key={s}
            instrument={bySymbol[s]}
            active={s === symbol}
            onSelect={() => setSymbol(s)}
            onRemove={() => remove(s)}
          />
        ))}
      </ul>
      <button
        id="add-instrument-btn"
        onClick={() => setAdding(true)}
        className="m-2 rounded-btn border border-dashed border-border-subtle py-2 text-xs text-txt-muted transition-colors hover:border-tp hover:text-tp"
      >
        + Tambah instrumen
      </button>

      <Modal open={adding} onClose={() => setAdding(false)} width={420}>
        <h3 className="mb-3 text-base font-semibold">Tambah ke Watchlist</h3>
        {available.length === 0 && <p className="text-sm text-txt-muted">Semua instrumen MVP sudah ada di watchlist.</p>}
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {available.map((i) => (
            <li key={i.symbol}>
              <button
                onClick={() => { if (add(i.symbol)) setSymbol(i.symbol); setAdding(false) }}
                className="flex w-full items-center justify-between rounded-btn px-3 py-2 text-left hover:bg-bg-elevated"
              >
                <span className="text-sm font-medium">{i.symbol}<span className="ml-2 text-xs text-txt-muted">{i.name}</span></span>
                <span className="text-[10px] uppercase text-txt-muted">{i.asset_class}</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </aside>
  )
}
