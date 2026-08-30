import type { Candle, CandlesResponse, Interval, Market } from '../../../shared/types';

const RANGE: Record<Interval, string> = { '1h': '3mo', '1d': '2y', '1wk': '10y' };
const MAX_BARS = 320;
const FETCH_TIMEOUT_MS = 12_000;

/** A real OHLC bar has four positive prices. Yahoo pads the still-forming
 *  last bar with nulls, which Number() turns into 0 and isFinite() accepts. */
function isRealBar(c: Candle): boolean {
  return [c.open, c.high, c.low, c.close].every((v) => Number.isFinite(v) && v > 0);
}

/** us/global equities keep their symbol; crypto is quoted against USD. */
function resolveSymbol(symbol: string, market: Market): string {
  if (market !== 'crypto') return symbol;
  if (/-USD$/.test(symbol)) return symbol;
  return `${symbol.replace(/USD[TC]?$/, '')}-USD`;
}

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 ChartLens/2.0', Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`provider returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

interface YahooChart {
  chart?: {
    result?: Array<{
      meta?: { longName?: string; shortName?: string };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: { description?: string } | null;
  };
}

function parse(payload: YahooChart): { name: string | null; candles: Candle[] } {
  const result = payload.chart?.result?.[0];
  const err = payload.chart?.error;
  if (err) throw new Error(err.description || 'provider error');
  if (!result?.timestamp?.length) throw new Error('no data for that symbol');

  const q = result.indicators?.quote?.[0] ?? {};
  const candles: Candle[] = result.timestamp
    .map((t, i) => ({
      time: t * 1000,
      open: Number(q.open?.[i]),
      high: Number(q.high?.[i]),
      low: Number(q.low?.[i]),
      close: Number(q.close?.[i]),
      volume: Number(q.volume?.[i] ?? 0),
    }))
    .filter(isRealBar);

  const name = result.meta?.longName || result.meta?.shortName || null;
  return { name, candles };
}

export async function getCandles(
  symbol: string,
  market: Market,
  interval: Interval,
): Promise<CandlesResponse> {
  const resolved = resolveSymbol(symbol, market);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolved)}` +
    `?interval=${interval}&range=${RANGE[interval]}`;

  const { name, candles } = parse((await fetchJson(url)) as YahooChart);
  if (candles.length < 30) throw new Error(`not enough history for ${resolved}`);

  return {
    meta: { symbol: resolved, name, market, interval, provider: 'yahoo' },
    candles: candles.slice(-MAX_BARS),
  };
}
