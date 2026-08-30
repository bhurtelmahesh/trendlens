import type { CandlesResponse, Interval, Market } from '../../../shared/types';

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
