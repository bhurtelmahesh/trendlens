import type { Market, SearchResult } from '../../../shared/types';

const TIMEOUT_MS = 8_000;

interface YahooSearch {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchDisp?: string;
    exchange?: string;
    quoteType?: string;
  }>;
}

const TYPE_MAP: Record<string, SearchResult['type']> = {
  EQUITY: 'equity',
  ETF: 'etf',
  MUTUALFUND: 'etf',
  CRYPTOCURRENCY: 'crypto',
  INDEX: 'index',
};

/** Which market bucket a result belongs to, from its symbol / exchange. */
function bucket(symbol: string, exchange: string, type: SearchResult['type']): Market {
  if (type === 'crypto' || /-USD$/.test(symbol)) return 'crypto';
  const usEx = /NYSE|NASDAQ|NasdaqGS|NYSEArca|BATS|AMEX|OTC/i;
  if (!symbol.includes('.') && (usEx.test(exchange) || exchange === '')) return 'us';
  return 'global';
}

/** Best-effort. Returns [] on any failure — the form works without it. */
export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url =
    `https://query1.finance.yahoo.com/v1/finance/search` +
    `?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 TrendLens/1.0', Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as YahooSearch;
    return (data.quotes ?? [])
      .filter((row) => row.symbol && TYPE_MAP[row.quoteType ?? ''])
      .map((row) => {
        const symbol = row.symbol!;
        const exchange = row.exchDisp || row.exchange || '';
        const type = TYPE_MAP[row.quoteType ?? '']!;
        return {
          symbol,
          name: row.shortname || row.longname || symbol,
          exchange,
          type,
          market: bucket(symbol, exchange, type),
        } satisfies SearchResult;
      })
      .slice(0, 8);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
