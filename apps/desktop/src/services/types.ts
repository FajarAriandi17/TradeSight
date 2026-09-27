export type Timeframe = '15m' | '1h' | '4h' | '1d'

export interface Instrument {
  symbol: string
  name: string
  asset_class: 'forex' | 'idx'
  precision: number
  delayed: boolean
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Point { time: number; value: number }
export interface MacdPoint { time: number; macd: number; signal: number; hist: number }

export interface IndicatorSummary {
  rsi: number | null
  rsi_state: 'oversold' | 'overbought' | 'neutral'
  macd: number | null
  macd_signal: number | null
  macd_hist: number | null
  macd_state: 'bullish' | 'bearish' | 'neutral'
  ma_fast: number | null
  ma_slow: number | null
  ma_state: 'bullish' | 'bearish' | 'neutral'
}

export interface Level {
  price: number
  kind: 'support' | 'resistance'
  touches: number
  strength: number
}

export interface Signal {
  direction: 'buy' | 'sell' | 'none'
  entry: number | null
  take_profit: number | null
  stop_loss: number | null
  risk_reward: number | null
  confidence: number
  status: 'no-signal' | 'active-signal' | 'signal-hit-tp' | 'signal-hit-sl'
  reasons: string[]
  generated_at: number
  disclaimer: string
}

export interface Analysis {
  instrument: Instrument
  timeframe: Timeframe
  source: string
  candles: Candle[]
  indicators: { ma_fast: Point[]; ma_slow: Point[]; rsi: Point[]; macd: MacdPoint[] }
  summary: IndicatorSummary
  levels: Level[]
  signal: Signal
}

export interface Quote { symbol: string; price: number; change_pct: number; time: number }

export interface TickMessage {
  type: 'tick' | 'error'
  symbol: string
  timeframe: Timeframe
  source: string
  candle: Candle
  summary: IndicatorSummary
  signal?: Signal
  levels?: Level[]
  message?: string
}

export interface ScreenerRow {
  instrument: Instrument
  timeframe: Timeframe
  price: number
  change_pct: number
  direction: 'buy' | 'sell' | 'none'
  confidence: number
  risk_reward: number | null
  rsi: number | null
  rsi_state: 'oversold' | 'overbought' | 'neutral'
  ma_state: 'bullish' | 'bearish' | 'neutral'
  macd_state: 'bullish' | 'bearish' | 'neutral'
  entry: number | null
  take_profit: number | null
  stop_loss: number | null
}

export interface MtfFrame {
  timeframe: Timeframe
  signal: Signal
  summary: IndicatorSummary
  source: string
}

export interface MtfResult {
  instrument: Instrument
  frames: MtfFrame[]
  bias: 'buy' | 'sell' | 'none'
  bias_score: number
  agreement: number
}

export interface BacktestTrade {
  direction: 'buy' | 'sell'
  entry: number
  take_profit: number
  stop_loss: number
  risk_reward: number
  opened_at: number
  closed_at: number | null
  exit_price: number | null
  outcome: 'win' | 'loss' | 'open'
  r_multiple: number
}

export interface BacktestResult {
  instrument: Instrument
  timeframe: Timeframe
  source: string
  bars: number
  trades: number
  wins: number
  losses: number
  open_trades: number
  win_rate: number
  avg_rr: number
  expectancy_r: number
  profit_factor: number
  total_r: number
  trade_list: BacktestTrade[]
  disclaimer: string
}

export interface ScreenerFilters {
  timeframe: Timeframe
  direction: 'all' | 'any' | 'buy' | 'sell'
  asset_class: 'all' | 'forex' | 'idx'
  min_rr: number
  min_confidence: number
}
