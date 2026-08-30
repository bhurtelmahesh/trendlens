import type { Candle, CandlesResponse } from '../../../shared/types';

// NEPSE: unofficial daily history from merolagani's TradingView chart feed.
// Public, no key, no auth. Daily bars only (resolution=D).
const BASE = 'https://merolagani.com/handlers/webrequesthandler.ashx';
const LOOKBACK_DAYS = 400;
const MAX_BARS = 320;
const FETCH_TIMEOUT_MS = 12_000;

interface Udf {
  s: 'ok' | 'no_data' | 'error';
  t?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
}

function isRealBar(c: Candle): boolean {
  return [c.open, c.high, c.low, c.close].every((v) => Number.isFinite(v) && v > 0);
}

export async function getNepseCandles(symbol: string): Promise<CandlesResponse> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - LOOKBACK_DAYS * 86_400;
  const url =
    `${BASE}?type=get_advanced_chart&symbol=${encodeURIComponent(symbol)}` +
    `&resolution=D&isAdjust=1&currencyCode=NPR&rangeStartDate=${from}&rangeEndDate=${now}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let data: Udf;
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 TrendLens/1.0',
        Accept: 'application/json',
        Referer: 'https://merolagani.com/',
      },
    });
    if (!res.ok) throw new Error(`NEPSE source returned ${res.status}`);
    data = (await res.json()) as Udf;
  } finally {
    clearTimeout(timer);
  }

  if (data.s === 'no_data') throw new Error(`no NEPSE listing for ${symbol}`);
  if (data.s !== 'ok' || !Array.isArray(data.t)) throw new Error('NEPSE source is unavailable');

  const candles: Candle[] = data.t
    .map((t, i) => ({
      time: t * 1000,
      open: Number(data.o?.[i]),
      high: Number(data.h?.[i]),
      low: Number(data.l?.[i]),
      close: Number(data.c?.[i]),
      volume: Number(data.v?.[i] ?? 0),
    }))
    .filter(isRealBar)
    .sort((a, b) => a.time - b.time);

  if (candles.length < 30) throw new Error(`not enough NEPSE history for ${symbol}`);

  return {
    meta: {
      symbol,
      name: null,
      market: 'nepse',
      interval: '1d',
      provider: 'merolagani',
      notice: 'Unofficial NEPSE data (merolagani.com) — daily bars only, may lag the exchange.',
    },
    candles: candles.slice(-MAX_BARS),
  };
}
