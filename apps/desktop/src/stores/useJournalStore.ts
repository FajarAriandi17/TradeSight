import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Signal, Timeframe } from '../services/types'

export type TradeStatus = 'open' | 'win' | 'loss' | 'closed'

export interface JournalTrade {
  id: string
  symbol: string
  timeframe: Timeframe
  direction: 'buy' | 'sell'
  entry: number
  take_profit: number
  stop_loss: number
  risk_reward: number
  confidence: number
  openedAt: number   // unix seconds
  closedAt: number | null
  exitPrice: number | null
  status: TradeStatus
  r_multiple: number  // realisasi kelipatan risiko
}

export interface JournalStats {
  total: number
  open: number
  wins: number
  losses: number
  winRate: number      // 0..1 dari trade selesai
  totalR: number
  expectancyR: number  // per trade selesai
  profitFactor: number
}

interface JournalState {
  trades: JournalTrade[]
  follow: (t: { symbol: string; timeframe: Timeframe; signal: Signal }) => JournalTrade | null
  evaluate: (symbol: string, price: number) => JournalTrade[]  // trade yang baru tertutup
  closeManual: (id: string, price: number) => void
  remove: (id: string) => void
  clearClosed: () => void
}

function rMultiple(t: Pick<JournalTrade, 'direction' | 'entry' | 'stop_loss'>, exit: number): number {
  const risk = Math.abs(t.entry - t.stop_loss)
  if (!risk) return 0
  const raw = t.direction === 'buy' ? (exit - t.entry) / risk : (t.entry - exit) / risk
  return Math.round(raw * 1000) / 1000
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      trades: [],
      follow: ({ symbol, timeframe, signal }) => {
        if (signal.direction === 'none' || signal.entry == null || signal.take_profit == null || signal.stop_loss == null)
          return null
        const dup = get().trades.find(
          (x) => x.status === 'open' && x.symbol === symbol && x.direction === signal.direction && x.entry === signal.entry,
        )
        if (dup) return dup
        const trade: JournalTrade = {
          id: `${symbol}-${signal.generated_at}-${Math.random().toString(36).slice(2, 7)}`,
          symbol, timeframe, direction: signal.direction, entry: signal.entry,
          take_profit: signal.take_profit, stop_loss: signal.stop_loss,
          risk_reward: signal.risk_reward ?? 0, confidence: signal.confidence,
          openedAt: Math.floor(Date.now() / 1000), closedAt: null, exitPrice: null,
          status: 'open', r_multiple: 0,
        }
        set({ trades: [trade, ...get().trades].slice(0, 300) })
        return trade
      },
      evaluate: (symbol, price) => {
        const closed: JournalTrade[] = []
        const trades = get().trades.map((t) => {
          if (t.status !== 'open' || t.symbol !== symbol) return t
          const hitTp = t.direction === 'buy' ? price >= t.take_profit : price <= t.take_profit
          const hitSl = t.direction === 'buy' ? price <= t.stop_loss : price >= t.stop_loss
          if (!hitTp && !hitSl) return t
          const exit = hitSl ? t.stop_loss : t.take_profit  // SL diprioritaskan (konservatif)
          const done: JournalTrade = {
            ...t, status: hitSl ? 'loss' : 'win', exitPrice: exit,
            closedAt: Math.floor(Date.now() / 1000), r_multiple: rMultiple(t, exit),
          }
          closed.push(done)
          return done
        })
        if (closed.length) set({ trades })
        return closed
      },
      closeManual: (id, price) =>
        set({
          trades: get().trades.map((t) =>
            t.id === id && t.status === 'open'
              ? { ...t, status: 'closed', exitPrice: price, closedAt: Math.floor(Date.now() / 1000), r_multiple: rMultiple(t, price) }
              : t,
          ),
        }),
      remove: (id) => set({ trades: get().trades.filter((t) => t.id !== id) }),
      clearClosed: () => set({ trades: get().trades.filter((t) => t.status === 'open') }),
    }),
    { name: 'tradesight-journal' },
  ),
)

export function computeStats(trades: JournalTrade[]): JournalStats {
  const done = trades.filter((t) => t.status !== 'open')
  const wins = done.filter((t) => t.r_multiple > 0)
  const losses = done.filter((t) => t.r_multiple <= 0)
  const winR = wins.reduce((a, t) => a + t.r_multiple, 0)
  const lossR = losses.reduce((a, t) => a + t.r_multiple, 0)
  const totalR = winR + lossR
  return {
    total: trades.length,
    open: trades.length - done.length,
    wins: wins.length,
    losses: losses.length,
    winRate: done.length ? wins.length / done.length : 0,
    totalR: Math.round(totalR * 100) / 100,
    expectancyR: done.length ? Math.round((totalR / done.length) * 1000) / 1000 : 0,
    profitFactor: lossR ? Math.round((winR / Math.abs(lossR)) * 100) / 100 : winR || 0,
  }
}
