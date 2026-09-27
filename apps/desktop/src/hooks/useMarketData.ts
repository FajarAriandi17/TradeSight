import { useCallback, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { StreamClient } from '../services/wsClient'
import { notify } from '../services/notify'
import { useChartStore } from '../stores/useChartStore'
import { useWatchlistStore } from '../stores/useWatchlistStore'
import { useUserStore } from '../stores/useUserStore'

/** Memuat historis (REST) + subscribe WebSocket untuk instrumen aktif; polling quote watchlist. */
export function useMarketData() {
  const symbol = useChartStore((s) => s.symbol)
  const timeframe = useChartStore((s) => s.timeframe)
  const symbols = useWatchlistStore((s) => s.symbols)
  const reloadRef = useRef(0)

  const load = useCallback(async () => {
    const st = useChartStore.getState()
    st.setLoad('loading')
    const ctrl = new AbortController()
    const id = ++reloadRef.current
    try {
      const a = await api.history(symbol, timeframe, ctrl.signal)
      if (id !== reloadRef.current) return
      st.setAnalysis(a)
      if (a.signal.direction !== 'none') st.logSignal({ symbol, timeframe, signal: a.signal })
    } catch (e) {
      if (id === reloadRef.current) st.setLoad('error', (e as Error).message)
    }
  }, [symbol, timeframe])

  // historis + stream
  useEffect(() => {
    load()
    const client = new StreamClient(
      symbol,
      timeframe,
      (msg) => {
        if (msg.type !== 'tick') return
        const st = useChartStore.getState()
        if (st.analysis?.instrument.symbol !== msg.symbol || st.analysis.timeframe !== msg.timeframe) return
        const prevSig = st.analysis.signal
        st.applyTick(msg.candle, msg.summary, msg.source, msg.signal, msg.levels)
        useWatchlistStore.getState().updatePrice(msg.symbol, msg.candle.close)

        // notifikasi: sinyal baru / level TP-SL tersentuh (premium)
        const user = useUserStore.getState()
        const premium = user.plan === 'premium' && user.notifications
        if (msg.signal && msg.signal.direction !== 'none') {
          st.logSignal({ symbol: msg.symbol, timeframe: msg.timeframe, signal: msg.signal })
          if (premium && msg.signal.entry !== prevSig.entry)
            notify(`Setup ${msg.signal.direction.toUpperCase()} ${msg.symbol}`, `Entry ${msg.signal.entry} · TP ${msg.signal.take_profit} · SL ${msg.signal.stop_loss}`)
        }
        if (premium && prevSig.direction !== 'none' && prevSig.take_profit && prevSig.stop_loss) {
          const p = msg.candle.close
          const hitTp = prevSig.direction === 'buy' ? p >= prevSig.take_profit : p <= prevSig.take_profit
          const hitSl = prevSig.direction === 'buy' ? p <= prevSig.stop_loss : p >= prevSig.stop_loss
          if (hitTp || hitSl) notify(`${msg.symbol}: ${hitTp ? 'Take Profit' : 'Stop Loss'} tersentuh`, `Harga ${p}`)
        }
      },
      (c) => useChartStore.getState().setConn(c),
    )
    return () => client.close()
  }, [symbol, timeframe, load])

  // quote watchlist
  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const q = await api.quotes(symbols)
        if (alive) useWatchlistStore.getState().setQuotes(q)
      } catch { /* sidecar belum siap */ }
    }
    tick()
    const t = setInterval(tick, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [symbols])

  return { reload: load }
}
