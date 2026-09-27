import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Analysis, Candle, IndicatorSummary, Instrument, Level, Signal, Timeframe } from '../services/types'

export type IndicatorKey = 'ma' | 'rsi' | 'macd' | 'sr' | 'signal' | 'volume'
export type LoadState = 'loading' | 'live' | 'error'
export type ConnStatus = 'connecting' | 'live' | 'offline'

export interface SignalLogEntry {
  symbol: string
  timeframe: Timeframe
  signal: Signal
}

interface ChartState {
  instruments: Instrument[]
  symbol: string
  timeframe: Timeframe
  indicators: Record<IndicatorKey, boolean>
  analysis: Analysis | null
  loadState: LoadState
  error: string
  conn: ConnStatus
  source: string
  history: SignalLogEntry[]
  setInstruments: (i: Instrument[]) => void
  setSymbol: (s: string) => void
  setTimeframe: (t: Timeframe) => void
  toggleIndicator: (k: IndicatorKey) => void
  setAnalysis: (a: Analysis) => void
  setLoad: (s: LoadState, error?: string) => void
  setConn: (c: ConnStatus) => void
  applyTick: (candle: Candle, summary: IndicatorSummary, source: string, signal?: Signal, levels?: Level[]) => void
  logSignal: (e: SignalLogEntry) => void
}

export const useChartStore = create<ChartState>()(
  persist(
    (set, get) => ({
      instruments: [],
      symbol: 'EURUSD',
      timeframe: '1h',
      indicators: { ma: true, rsi: true, macd: true, sr: true, signal: true, volume: true },
      analysis: null,
      loadState: 'loading',
      error: '',
      conn: 'connecting',
      source: '',
      history: [],
      setInstruments: (instruments) => set({ instruments }),
      setSymbol: (symbol) => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      toggleIndicator: (k) => set({ indicators: { ...get().indicators, [k]: !get().indicators[k] } }),
      setAnalysis: (analysis) => set({ analysis, source: analysis.source, loadState: 'live', error: '' }),
      setLoad: (loadState, error = '') => set({ loadState, error }),
      setConn: (conn) => set({ conn }),
      applyTick: (candle, summary, source, signal, levels) => {
        const a = get().analysis
        if (!a) return
        const candles = a.candles.slice()
        const last = candles[candles.length - 1]
        if (last && last.time === candle.time) candles[candles.length - 1] = candle
        else if (!last || candle.time > last.time) candles.push(candle)
        set({
          source,
          analysis: { ...a, candles, summary, signal: signal ?? a.signal, levels: levels ?? a.levels },
        })
      },
      logSignal: (e) => {
        const h = get().history
        const dup = h.find((x) => x.symbol === e.symbol && x.signal.entry === e.signal.entry && x.signal.direction === e.signal.direction)
        if (!dup) set({ history: [e, ...h].slice(0, 100) })
      },
    }),
    {
      name: 'tradesight-chart',
      partialize: (s) => ({ symbol: s.symbol, timeframe: s.timeframe, indicators: s.indicators, history: s.history }),
    },
  ),
)
