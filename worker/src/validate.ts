import type { Interval, Market } from '../../shared/types';

export const INTERVALS: Interval[] = ['1m', '5m', '1h', '1d', '1wk'];
export const MARKETS: Market[] = ['us', 'crypto', 'global', 'nepse'];
const MAX_SYMBOL_LEN = 24;

export interface ParsedCandlesQuery {
  symbol: string;
  market: Market;
  interval: Interval;
}

/** Returns the parsed query or an error string (never throws). */
export function parseCandlesQuery(params: URLSearchParams): ParsedCandlesQuery | string {
  const symbol = (params.get('symbol') ?? '').trim().toUpperCase();
  if (!symbol) return 'Missing "symbol".';
  if (symbol.length > MAX_SYMBOL_LEN) return `"symbol" is too long (max ${MAX_SYMBOL_LEN}).`;
  if (!/^[A-Z0-9.^=-]+$/.test(symbol)) return 'That symbol has characters we do not allow.';

  const market = (params.get('market') ?? 'us').toLowerCase() as Market;
  if (!MARKETS.includes(market)) return `Unsupported market "${market}".`;

  const interval = (params.get('interval') ?? '1d') as Interval;
  if (!INTERVALS.includes(interval)) return `Unsupported interval "${interval}".`;

  return { symbol, market, interval };
}
