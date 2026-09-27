import { WS_URL } from './api'
import type { TickMessage, Timeframe } from './types'

type Handler = (msg: TickMessage) => void
type StatusHandler = (s: 'connecting' | 'live' | 'offline') => void

/** WebSocket client dengan auto-reconnect (exponential backoff). */
export class StreamClient {
  private ws: WebSocket | null = null
  private closed = false
  private retry = 0
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private symbol: string,
    private timeframe: Timeframe,
    private onMessage: Handler,
    private onStatus: StatusHandler,
  ) {
    this.connect()
  }

  private connect() {
    if (this.closed) return
    this.onStatus('connecting')
    const ws = new WebSocket(`${WS_URL}/stream/${this.symbol}?timeframe=${this.timeframe}`)
    this.ws = ws
    ws.onopen = () => {
      this.retry = 0
      this.onStatus('live')
    }
    ws.onmessage = (e) => {
      try {
        this.onMessage(JSON.parse(e.data))
      } catch {
        /* ignore */
      }
    }
    ws.onclose = () => {
      if (this.closed) return
      this.onStatus('offline')
      const delay = Math.min(1000 * 2 ** this.retry++, 15000)
      this.timer = setTimeout(() => this.connect(), delay)
    }
    ws.onerror = () => ws.close()
  }

  close() {
    this.closed = true
    if (this.timer) clearTimeout(this.timer)
    this.ws?.close()
  }
}
