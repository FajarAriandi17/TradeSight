import { useEffect, useRef } from 'react'
import {
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useChartStore } from '../../stores/useChartStore'
import { useUserStore } from '../../stores/useUserStore'
import { ChartSkeleton } from '../common/LoadingSkeleton'
import { Button } from '../common/Button'
import { SignalOverlay } from './SignalOverlay'
import type { Timeframe } from '../../services/types'

const TIMEFRAMES: Timeframe[] = ['15m', '1h', '4h', '1d']
const PREMIUM_TF: Timeframe[] = ['15m', '4h']

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const ts = (t: number) => t as UTCTimestamp

export function ChartPanel({ onRetry, expanded = false }: { onRetry: () => void; expanded?: boolean }) {
  const mainRef = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  const subChart = useRef<IChartApi | null>(null)
  const series = useRef<{
    candle?: ISeriesApi<'Candlestick'>
    volume?: ISeriesApi<'Histogram'>
    maFast?: ISeriesApi<'Line'>
    maSlow?: ISeriesApi<'Line'>
    rsi?: ISeriesApi<'Line'>
    macd?: ISeriesApi<'Line'>
    macdSig?: ISeriesApi<'Line'>
    macdHist?: ISeriesApi<'Histogram'>
  }>({})
  const loadedKey = useRef('')

  const { analysis, loadState, error, timeframe, setTimeframe, indicators } = useChartStore()
  const theme = useUserStore((s) => s.theme)
  const plan = useUserStore((s) => s.plan)
  const openPaywall = useUserStore((s) => s.openPaywall)
  const showSub = indicators.rsi || indicators.macd

  // ---- create charts once
  useEffect(() => {
    if (!mainRef.current || !subRef.current) return
    const base = {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: cssVar('--text-muted'),
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 11,
      },
      grid: { vertLines: { color: cssVar('--border-subtle') }, horzLines: { color: cssVar('--border-subtle') } },
      rightPriceScale: { borderColor: cssVar('--border-subtle') },
      timeScale: { borderColor: cssVar('--border-subtle'), timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    }
    const c = createChart(mainRef.current, base)
    const s = createChart(subRef.current, { ...base, timeScale: { ...base.timeScale, visible: true } })
    chart.current = c
    subChart.current = s

    series.current.candle = c.addCandlestickSeries({
      upColor: '#22C55E', downColor: '#EF4444', borderVisible: false, wickUpColor: '#22C55E', wickDownColor: '#EF4444',
    })
    series.current.volume = c.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol', lastValueVisible: false, priceLineVisible: false })
    c.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    series.current.maFast = c.addLineSeries({ color: '#F59E0B', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: 'MA20' })
    series.current.maSlow = c.addLineSeries({ color: '#A855F7', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: 'MA50' })

    series.current.rsi = s.addLineSeries({ color: '#38BDF8', lineWidth: 1, priceScaleId: 'rsi', priceLineVisible: false, title: 'RSI' })
    s.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.05, bottom: 0.55 } })
    series.current.rsi.createPriceLine({ price: 70, color: '#EF444488', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' })
    series.current.rsi.createPriceLine({ price: 30, color: '#22C55E88', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' })
    series.current.macdHist = s.addHistogramSeries({ priceScaleId: 'macd', priceLineVisible: false, lastValueVisible: false })
    series.current.macd = s.addLineSeries({ color: '#3B82F6', lineWidth: 1, priceScaleId: 'macd', priceLineVisible: false, lastValueVisible: false, title: 'MACD' })
    series.current.macdSig = s.addLineSeries({ color: '#F97316', lineWidth: 1, priceScaleId: 'macd', priceLineVisible: false, lastValueVisible: false })
    s.priceScale('macd').applyOptions({ scaleMargins: { top: 0.55, bottom: 0.05 } })

    // sinkronisasi scroll/zoom antar pane
    let syncing = false
    const sync = (target: IChartApi) => (r: LogicalRange | null) => {
      if (syncing || !r) return
      syncing = true
      target.timeScale().setVisibleLogicalRange(r)
      syncing = false
    }
    c.timeScale().subscribeVisibleLogicalRangeChange(sync(s))
    s.timeScale().subscribeVisibleLogicalRangeChange(sync(c))

    return () => {
      c.remove()
      s.remove()
      chart.current = null
      subChart.current = null
      series.current = {}
      loadedKey.current = ''
    }
  }, [])

  // ---- theme
  useEffect(() => {
    const opts = {
      layout: { textColor: cssVar('--text-muted') },
      grid: { vertLines: { color: cssVar('--border-subtle') }, horzLines: { color: cssVar('--border-subtle') } },
    }
    chart.current?.applyOptions(opts)
    subChart.current?.applyOptions(opts)
  }, [theme])

  // ---- data
  useEffect(() => {
    const s = series.current
    if (!analysis || !s.candle) return
    const key = `${analysis.instrument.symbol}:${analysis.timeframe}`
    const prec = analysis.instrument.precision
    s.candle.applyOptions({ priceFormat: { type: 'price', precision: prec, minMove: prec ? 1 / 10 ** prec : 1 } })
    s.candle.setData(analysis.candles.map((c) => ({ time: ts(c.time), open: c.open, high: c.high, low: c.low, close: c.close })))
    s.volume!.setData(
      indicators.volume
        ? analysis.candles.map((c) => ({ time: ts(c.time), value: c.volume, color: c.close >= c.open ? '#22C55E40' : '#EF444440' }))
        : [],
    )
    s.maFast!.setData(indicators.ma ? analysis.indicators.ma_fast.map((p) => ({ time: ts(p.time), value: p.value })) : [])
    s.maSlow!.setData(indicators.ma ? analysis.indicators.ma_slow.map((p) => ({ time: ts(p.time), value: p.value })) : [])
    s.rsi!.setData(indicators.rsi ? analysis.indicators.rsi.map((p) => ({ time: ts(p.time), value: p.value })) : [])
    const m = indicators.macd ? analysis.indicators.macd : []
    s.macd!.setData(m.map((p) => ({ time: ts(p.time), value: p.macd })))
    s.macdSig!.setData(m.map((p) => ({ time: ts(p.time), value: p.signal })))
    s.macdHist!.setData(m.map((p) => ({ time: ts(p.time), value: p.hist, color: p.hist >= 0 ? '#22C55E80' : '#EF444480' })))
    if (loadedKey.current !== key) {
      loadedKey.current = key
      const n = analysis.candles.length
      chart.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 150), to: n + 5 })
    }
  }, [analysis, indicators])

  const pickTf = (tf: Timeframe) => {
    if (plan === 'free' && PREMIUM_TF.includes(tf)) {
      openPaywall(`Timeframe ${tf} tersedia untuk pengguna Premium.`)
      return
    }
    setTimeframe(tf)
  }

  return (
    <section id="chart-panel" className="relative flex h-full min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">
            {analysis?.instrument.symbol ?? '—'}
            <span className="ml-2 font-normal text-txt-muted">{analysis?.instrument.name}</span>
          </h2>
          {analysis?.instrument.delayed && (
            <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">DELAYED DATA</span>
          )}
        </div>
        <div id="timeframe-toolbar" className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => pickTf(tf)}
              className={`num rounded-btn px-2.5 py-1 text-xs transition-colors duration-150 ${
                tf === timeframe ? 'bg-tp text-white' : 'text-txt-muted hover:bg-bg-elevated hover:text-txt-primary'
              }`}
            >
              {tf.toUpperCase()}
              {plan === 'free' && PREMIUM_TF.includes(tf) && <span className="ml-0.5 text-[9px]">🔒</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={mainRef} className="absolute inset-0" />
        {analysis && <SignalOverlay series={series.current.candle} />}
        {loadState === 'loading' && (
          <div className="absolute inset-0 z-10 bg-bg-primary"><ChartSkeleton /></div>
        )}
        {loadState === 'error' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bg-primary">
            <p className="text-sm text-sl">Gagal memuat data: {error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>Coba lagi</Button>
          </div>
        )}
      </div>
      <div
        className="relative border-t border-border-subtle transition-[height] duration-200"
        style={{ height: showSub ? (expanded ? 220 : 170) : 0 }}
      >
        <div ref={subRef} className="absolute inset-0" />
      </div>
    </section>
  )
}
