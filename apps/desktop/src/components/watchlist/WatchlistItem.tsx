import { memo, useEffect, useRef, useState } from 'react'
import { useWatchlistStore } from '../../stores/useWatchlistStore'
import { fmtPct, fmtPrice } from '../../services/format'
import type { Instrument } from '../../services/types'

/** Harga dipisah jadi komponen sendiri agar animasi flash tidak me-render ulang chart (PRD §11). */
const PriceCell = memo(function PriceCell({ symbol, precision }: { symbol: string; precision: number }) {
  const q = useWatchlistStore((s) => s.quotes[symbol])
  const prev = useRef<number | undefined>(undefined)
  const [flash, setFlash] = useState<'' | 'flash-up' | 'flash-down'>('')

  useEffect(() => {
    if (q && prev.current !== undefined && q.price !== prev.current) {
      setFlash(q.price > prev.current ? 'flash-up' : 'flash-down')
      const t = setTimeout(() => setFlash(''), 700)
      prev.current = q.price
      return () => clearTimeout(t)
    }
    prev.current = q?.price
  }, [q?.price])

  if (!q) return <div className="skeleton h-3 w-14" />
  const state = q.change_pct > 0 ? 'up' : q.change_pct < 0 ? 'down' : 'neutral'
  return (
    <div className="text-right">
      <div className={`num rounded px-1 text-xs ${flash}`}>{fmtPrice(q.price, precision)}</div>
      <div className={`num text-[10px] ${state === 'up' ? 'text-buy' : state === 'down' ? 'text-sl' : 'text-txt-muted'}`}>
        {fmtPct(q.change_pct)}
      </div>
    </div>
  )
})

export function WatchlistItem({
  instrument, active, onSelect, onRemove,
}: { instrument: Instrument; active: boolean; onSelect: () => void; onRemove: () => void }) {
  return (
    <li
      onClick={onSelect}
      className={`watchlist-item hover-lift group flex cursor-pointer items-center justify-between rounded-btn px-2.5 py-2 ${
        active ? 'bg-bg-elevated ring-1 ring-tp/40' : 'hover:bg-bg-elevated'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {instrument.symbol}
          <span className={`rounded px-1 text-[9px] uppercase ${instrument.asset_class === 'forex' ? 'bg-tp/15 text-tp' : 'bg-buy/15 text-buy'}`}>
            {instrument.asset_class === 'forex' ? 'FX' : 'IDX'}
          </span>
        </div>
        <div className="truncate text-[10px] text-txt-muted">{instrument.name}</div>
      </div>
      <div className="flex items-center gap-1">
        <PriceCell symbol={instrument.symbol} precision={instrument.precision} />
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          title="Hapus dari watchlist"
          className="ml-1 hidden text-txt-muted hover:text-sl group-hover:block"
        >×</button>
      </div>
    </li>
  )
}
