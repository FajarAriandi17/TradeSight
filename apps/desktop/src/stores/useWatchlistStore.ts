import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Quote } from '../services/types'
import { FREE_WATCHLIST_LIMIT, useUserStore } from './useUserStore'

interface WatchlistState {
  symbols: string[]
  quotes: Record<string, Quote>
  add: (symbol: string) => boolean
  remove: (symbol: string) => void
  setQuotes: (q: Quote[]) => void
  updatePrice: (symbol: string, price: number) => void
}

export const DEFAULT_WATCHLIST = ['EURUSD', 'XAUUSD', 'GBPUSD', 'BBCA', 'TLKM']

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      symbols: DEFAULT_WATCHLIST,
      quotes: {},
      add: (symbol) => {
        const { symbols } = get()
        if (symbols.includes(symbol)) return true
        const { plan, openPaywall } = useUserStore.getState()
        if (plan === 'free' && symbols.length >= FREE_WATCHLIST_LIMIT) {
          openPaywall(`Watchlist gratis dibatasi ${FREE_WATCHLIST_LIMIT} instrumen.`)
          return false
        }
        set({ symbols: [...symbols, symbol] })
        return true
      },
      remove: (symbol) => set({ symbols: get().symbols.filter((s) => s !== symbol) }),
      setQuotes: (list) => {
        const quotes = { ...get().quotes }
        list.forEach((q) => (quotes[q.symbol] = q))
        set({ quotes })
      },
      updatePrice: (symbol, price) => {
        const q = get().quotes[symbol]
        if (!q || q.price === price) return
        const prevClose = q.price / (1 + q.change_pct / 100)
        set({
          quotes: { ...get().quotes, [symbol]: { ...q, price, change_pct: ((price - prevClose) / prevClose) * 100 } },
        })
      },
    }),
    { name: 'tradesight-watchlist', partialize: (s) => ({ symbols: s.symbols }) },
  ),
)
