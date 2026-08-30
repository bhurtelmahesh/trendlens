import type { Candle, CandlesResponse, Interval, Market } from '../../../shared/types';

const RANGE: Record<Interval, string> = { '1h': '3mo', '1d': '2y', '1wk': '10y' };
const MAX_BARS = 320;
const MIN_BARS = 30;
const FETCH_TIMEOUT_MS = 12_000;

// For "other global": if the user didn't add an exchange suffix, try the
// big ones. Order = rough listing-volume priority. `''` (bare) goes first.
const GLOBAL_SUFFIXES = ['', '.T', '.HK', '.L', '.DE', '.TO', '.AX', '.PA', '.SW', '.NS'];
const SUFFIX_EXCHANGE: Record<string, string> = {
  '.T': 'Tokyo',
  '.HK': 'Hong Kong',
  '.L': 'London',
  '.DE': 'Frankfurt',
  '.TO': 'Toronto',
  '.AX': 'Sydney',
  '.PA': 'Paris',
  '.SW': 'Zurich',
  '.NS': 'India (NSE)',
};

/** A real OHLC bar has four positive prices. Yahoo pads the still-forming
 *  last bar with nulls, which Number() turns into 0 and isFinite() accepts. */
function isRealBar(c: Candle): boolean {
  return [c.open, c.high, c.low, c.close].every((v) => Number.isFinite(v) && v > 0);
}

/** The list of symbols to try, in order. First hit wins. */
function candidateSymbols(symbol: string, market: Market): string[] {
  if (market === 'crypto') {
    return [/-USD$/.test(symbol) ? symbol : `${symbol.replace(/USD[TC]?$/, '')}-USD`];
  }
  // An explicit suffix (AAPL.MX) or index (^GSPC) is taken as-is.
  if (symbol.includes('.') || symbol.startsWith('^')) return [symbol];
  if (market === 'global') return GLOBAL_SUFFIXES.map((s) => symbol + s);
  return [symbol];
}

async function fetchChart(symbol: string, interval: Interval): Promise<YahooChart> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${interval}&range=${RANGE[interval]}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 ChartLens/2.0', Accept: 'application/json' },
    });
    if (res.status === 404) throw new NotFound(symbol);
    if (!res.ok) throw new Error(`provider returned ${res.status}`);
    return (await res.json()) as YahooChart;
  } finally {
    clearTimeout(timer);
  }
}

class NotFound extends Error {
  constructor(readonly symbol: string) {
    super(`no such symbol: ${symbol}`);
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
  if (payload.chart?.error) throw new Error(payload.chart.error.description || 'provider error');
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

  return { name: result.meta?.longName || result.meta?.shortName || null, candles };
}

export async function getCandles(
  symbol: string,
  market: Market,
  interval: Interval,
): Promise<CandlesResponse> {
  const candidates = candidateSymbols(symbol, market);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const { name, candles } = parse(await fetchChart(candidate, interval));
      if (candles.length < MIN_BARS) {
        lastError = new Error(`not enough history for ${candidate}`);
        continue;
      }
      const suffix = candidate.slice(symbol.length);
      const notice =
        suffix && SUFFIX_EXCHANGE[suffix]
          ? `Matched ${candidate} on ${SUFFIX_EXCHANGE[suffix]}. Add the suffix (${suffix}) next time to skip the guess.`
          : undefined;
      return {
        meta: { symbol: candidate, name, market, interval, provider: 'yahoo', ...(notice ? { notice } : {}) },
        candles: candles.slice(-MAX_BARS),
      };
    } catch (err) {
      lastError = err;
    }
  }

  if (market === 'global' && !symbol.includes('.')) {
    throw new Error(
      `no exchange had "${symbol}". Try adding the suffix — .T Tokyo, .L London, .HK Hong Kong, .DE Frankfurt.`,
    );
  }
  throw lastError instanceof Error ? lastError : new Error(`could not load ${symbol}`);
}
