import { useChartStore, type IndicatorKey } from '../../stores/useChartStore'

const ITEMS: { key: IndicatorKey; label: string }[] = [
  { key: 'ma', label: 'MA 20/50' },
  { key: 'rsi', label: 'RSI 14' },
  { key: 'macd', label: 'MACD' },
  { key: 'volume', label: 'Volume' },
  { key: 'sr', label: 'Support/Resistance' },
  { key: 'signal', label: 'Entry/TP/SL' },
]

export function IndicatorToggle() {
  const { indicators, toggleIndicator } = useChartStore()
  return (
    <div id="indicator-toggle" className="grid grid-cols-2 gap-1.5">
      {ITEMS.map((it) => (
        <label key={it.key} className="flex cursor-pointer items-center gap-2 rounded-btn px-1.5 py-1 text-xs text-txt-muted hover:bg-bg-elevated">
          <input
            type="checkbox"
            checked={indicators[it.key]}
            onChange={() => toggleIndicator(it.key)}
            className="h-3.5 w-3.5 accent-[#3B82F6]"
          />
          {it.label}
        </label>
      ))}
    </div>
  )
}
