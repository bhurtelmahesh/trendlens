import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, fetchCandles, peekSearch, searchSymbols } from './api';

// Module-level spies keep their call history between tests, so a
// "never called" assertion would pass only in the declared order and
// fail under --sequence.shuffle.
beforeEach(() => vi.clearAllMocks());

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const result = (symbol: string) => ({
  symbol, name: `${symbol} Inc`, exchange: 'NASDAQ', market: 'us', type: 'equity',
});

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('fetchCandles', () => {
  it('returns the payload when the worker answers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ meta: { symbol: 'AAPL' }, candles: [{ close: 1 }] })));
    const d = await fetchCandles('AAPL', 'us', '1d');
    expect(d.meta.symbol).toBe('AAPL');
  });

  it('surfaces the error text the worker sent, not a status code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'The market-data provider is rate-limiting requests right now.' }, 502)));
    await expect(fetchCandles('AAPL', 'us', '1d')).rejects.toThrow(/rate-limiting/);
  });

  it('falls back to a readable message when the body carries no error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('gateway blew up', { status: 502 })));
    await expect(fetchCandles('AAPL', 'us', '1d')).rejects.toThrow(/Request failed \(502\)/);
  });

  it('rejects a 200 that is not a candles payload', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ meta: { symbol: 'AAPL' } })));
    await expect(fetchCandles('AAPL', 'us', '1d')).rejects.toBeInstanceOf(ApiRequestError);
  });

  it('says the request timed out rather than leaking an AbortError', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u: string, o: RequestInit) =>
      // Behave like a real fetch: reject with AbortError when the signal fires.
      new Promise<Response>((_res, rej) => {
        o.signal?.addEventListener('abort', () =>
          rej(new DOMException('The operation was aborted.', 'AbortError')));
      })));
    // Timers must be faked before the call, or the 20s timeout is scheduled
    // against the real clock and never fires within the test budget.
    vi.useFakeTimers();
    try {
      const p = fetchCandles('AAPL', 'us', '1d');
      const assertion = expect(p).rejects.toThrow(/took too long/);
      await vi.advanceTimersByTimeAsync(21_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('escapes the symbol into the query', async () => {
    const f = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json({ meta: {}, candles: [] }));
    vi.stubGlobal('fetch', f);
    await fetchCandles('BRK-B', 'us', '1d').catch(() => {});
    expect(String(f.mock.calls[0]![0])).toContain('symbol=BRK-B');
  });
});

describe('search cache', () => {
  it('returns nothing for a query too short to be meaningful', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await searchSymbols('a')).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it('serves a repeat query from memory instead of the network', async () => {
    const f = vi.fn(async () => json({ results: [result('ZQA')] }));
    vi.stubGlobal('fetch', f);
    await searchSymbols('zqa');
    await searchSymbols('zqa');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('guesses from a cached prefix so the list can paint before the request lands', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ results: [result('ZQBIG'), result('ZQOTHER')] })));
    await searchSymbols('zq');
    const guess = peekSearch('zqb');
    expect(guess?.map((r) => r.symbol)).toEqual(['ZQBIG']);
  });

  it('has no guess for a prefix it has never seen', () => {
    expect(peekSearch('qqqqzz')).toBeUndefined();
  });

  it('keeps the form working when the search endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 502 })));
    await expect(searchSymbols('zznever')).resolves.toEqual([]);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down'); }));
    await expect(searchSymbols('zzalso')).resolves.toEqual([]);
  });
});
