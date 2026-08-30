// Contract shared by the Cloudflare Worker (market-data proxy) and the app.

/** One OHLC bar. `time` is epoch milliseconds. All prices are > 0. */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Market = 'us' | 'crypto' | 'global';
export type Interval = '1h' | '1d' | '1wk';

export interface CandlesRequest {
  symbol: string;
  market: Market;
  interval: Interval;
}

export interface CandlesMeta {
  symbol: string;
  name: string | null;
  market: Market;
  interval: Interval;
  provider: 'yahoo';
  /** Set when the data is stale, adjusted, or otherwise caveated. */
  notice?: string;
}

export interface CandlesResponse {
  meta: CandlesMeta;
  candles: Candle[];
}

export interface ApiError {
  error: string;
}

// ---- symbol search / autocomplete ----

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  /** Best-guess market bucket for this result. */
  market: Market;
  type: 'equity' | 'etf' | 'crypto' | 'index' | 'other';
}

export interface SearchResponse {
  results: SearchResult[];
}

// ---- analysis output ----

export type Direction = 'up' | 'down' | 'range';
export type Band = 'Low' | 'Moderate' | 'High';
export type Structure = 'higher-highs-higher-lows' | 'lower-highs-lower-lows' | 'mixed';
export type BreakOfStructure = 'bullish' | 'bearish' | 'none';

export interface SwingPoint {
  /** Index into the candle array. */
  index: number;
  price: number;
}

export interface AnalysisResult {
  direction: Direction;
  /** 0-100. An agreement score, NOT a probability. */
  confidence: number;
  band: Band;
  /** Percent change in the EMA per bar, over the lookback window. */
  emaSlopePctPerBar: number;
  emaPeriod: number;
  structure: Structure;
  breakOfStructure: BreakOfStructure;
  /** R-squared of a linear fit through recent closes. 0..1. */
  trendFit: number;
  lastSwingHigh: SwingPoint;
  lastSwingLow: SwingPoint;
  /** The most recent close. */
  lastClose: number;
  candleCount: number;
}
