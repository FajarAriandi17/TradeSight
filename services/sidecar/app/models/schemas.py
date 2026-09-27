"""Pydantic models (kontrak data UI <-> sidecar)."""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

Timeframe = Literal["15m", "1h", "4h", "1d"]
AssetClass = Literal["forex", "idx"]


class Instrument(BaseModel):
    symbol: str
    name: str
    asset_class: AssetClass
    precision: int = 2
    delayed: bool = False


class Candle(BaseModel):
    time: int  # unix seconds (UTC)
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0


class IndicatorPoint(BaseModel):
    time: int
    value: float


class MacdPoint(BaseModel):
    time: int
    macd: float
    signal: float
    hist: float


class IndicatorSet(BaseModel):
    ma_fast: List[IndicatorPoint] = []
    ma_slow: List[IndicatorPoint] = []
    rsi: List[IndicatorPoint] = []
    macd: List[MacdPoint] = []


class IndicatorSummary(BaseModel):
    rsi: Optional[float] = None
    rsi_state: Literal["oversold", "overbought", "neutral"] = "neutral"
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    macd_state: Literal["bullish", "bearish", "neutral"] = "neutral"
    ma_fast: Optional[float] = None
    ma_slow: Optional[float] = None
    ma_state: Literal["bullish", "bearish", "neutral"] = "neutral"


class Level(BaseModel):
    price: float
    kind: Literal["support", "resistance"]
    touches: int = 1
    strength: float = 0.0  # 0..1


class Signal(BaseModel):
    direction: Literal["buy", "sell", "none"]
    entry: Optional[float] = None
    take_profit: Optional[float] = None
    stop_loss: Optional[float] = None
    risk_reward: Optional[float] = None
    confidence: float = 0.0  # 0..1
    status: Literal["no-signal", "active-signal", "signal-hit-tp", "signal-hit-sl"] = "no-signal"
    reasons: List[str] = Field(default_factory=list)
    generated_at: int = 0
    disclaimer: str = (
        "Alat bantu analisa teknikal, BUKAN rekomendasi beli/jual. "
        "Trading forex & saham berisiko kerugian; keputusan akhir di tangan Anda."
    )


class Quote(BaseModel):
    symbol: str
    price: float
    change_pct: float
    time: int


class AnalysisResponse(BaseModel):
    instrument: Instrument
    timeframe: Timeframe
    source: str
    candles: List[Candle]
    indicators: IndicatorSet
    summary: IndicatorSummary
    levels: List[Level]
    signal: Signal


class ScreenerRow(BaseModel):
    """Satu baris hasil screener: instrumen + ringkasan sinyal & indikator terkini."""
    instrument: Instrument
    timeframe: Timeframe
    price: float
    change_pct: float
    direction: Literal["buy", "sell", "none"]
    confidence: float
    risk_reward: Optional[float] = None
    rsi: Optional[float] = None
    rsi_state: Literal["oversold", "overbought", "neutral"] = "neutral"
    ma_state: Literal["bullish", "bearish", "neutral"] = "neutral"
    macd_state: Literal["bullish", "bearish", "neutral"] = "neutral"
    entry: Optional[float] = None
    take_profit: Optional[float] = None
    stop_loss: Optional[float] = None


class MtfTimeframe(BaseModel):
    timeframe: Timeframe
    signal: Signal
    summary: IndicatorSummary
    source: str


class MtfResponse(BaseModel):
    """Analisa multi-timeframe (15m/1h/4h/1d) + bias konfluensi antar-timeframe."""
    instrument: Instrument
    frames: List[MtfTimeframe]
    bias: Literal["buy", "sell", "none"]
    bias_score: int  # jumlah buy - jumlah sell antar timeframe
    agreement: float  # 0..1 seberapa selaras arah antar timeframe


class BacktestTrade(BaseModel):
    direction: Literal["buy", "sell"]
    entry: float
    take_profit: float
    stop_loss: float
    risk_reward: float
    opened_at: int
    closed_at: Optional[int] = None
    exit_price: Optional[float] = None
    outcome: Literal["win", "loss", "open"] = "open"
    r_multiple: float = 0.0  # hasil dalam kelipatan risiko (win = +RR, loss = -1)


class BacktestResult(BaseModel):
    """Uji walk-forward strategi sinyal atas data historis (PRD §16: backtest sebelum rilis)."""
    instrument: Instrument
    timeframe: Timeframe
    source: str
    bars: int
    trades: int
    wins: int
    losses: int
    open_trades: int
    win_rate: float          # 0..1 dari trade yang sudah selesai
    avg_rr: float            # rata-rata target RR trade
    expectancy_r: float      # ekspektasi hasil per trade (kelipatan risiko)
    profit_factor: float     # total R menang / |total R kalah|
    total_r: float           # akumulasi kelipatan risiko
    trade_list: List[BacktestTrade] = Field(default_factory=list)
    disclaimer: str = (
        "Backtest atas data historis (sering delayed/demo) — hasil masa lalu "
        "TIDAK menjamin kinerja masa depan. Bukan rekomendasi investasi."
    )
