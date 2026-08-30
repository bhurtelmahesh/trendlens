import type { CandlesResponse, Interval, Market, SearchResult } from '../../../shared/types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8787';
const TIMEOUT_MS = 20_000;

export class ApiRequestError extends Error {}

export async function fetchCandles(
  symbol: string,
  market: Market,
  interval: Interval,
): Promise<CandlesResponse> {
  const url = `${API_BASE}/api/candles?symbol=${encodeURIComponent(symbol)}&market=${market}&interval=${interval}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const body = (await res.json().catch(() => null)) as CandlesResponse | { error?: string } | null;
    if (!res.ok || !body || !('candles' in body)) {
      const message =
        body && 'error' in body && body.error
          ? body.error
          : `Request failed (${res.status}).`;
      throw new ApiRequestError(message);
    }
    return body;
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiRequestError('The market-data service took too long. Try again.');
    }
    throw new ApiRequestError('Could not reach the market-data service.');
  } finally {
    clearTimeout(timer);
  }
}

// In-memory autocomplete cache. Re-typing or backspacing a query you've already
// searched is then instant instead of another ~200ms round trip.
const searchCache = new Map<string, SearchResult[]>();

/**
 * A synchronous best guess for `query`: an exact cache hit, or the longest
 * cached prefix filtered down. Lets the dropdown paint immediately while the
 * real request is in flight.
 */
export function peekSearch(query: string): SearchResult[] | undefined {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return undefined;
  const exact = searchCache.get(q);
  if (exact) return exact;
  for (let i = q.length - 1; i >= 2; i--) {
    const pre = searchCache.get(q.slice(0, i));
    if (pre) {
      return pre.filter(
        (r) => r.symbol.toLowerCase().startsWith(q) || r.name.toLowerCase().includes(q),
      );
    }
  }
  return undefined;
}

/** Best-effort symbol search for autocomplete. Returns [] on any problem. */
export async function searchSymbols(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  const cached = searchCache.get(key);
  if (cached) return cached;
  try {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`, { signal });
    if (!res.ok) return peekSearch(q) ?? [];
    const body = (await res.json()) as { results?: SearchResult[] };
    const results = body.results ?? [];
    searchCache.set(key, results);
    if (searchCache.size > 150) searchCache.delete(searchCache.keys().next().value as string);
    return results;
  } catch {
    return peekSearch(q) ?? [];
  }
}
