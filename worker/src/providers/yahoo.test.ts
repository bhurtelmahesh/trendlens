import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCandles } from './yahoo';

type Q = { open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[]; volume?: (number | null)[] };

/** A Yahoo chart payload built from explicit quote arrays. */
const payload = (q: Q, name = 'Test Corp') => ({
  chart: {
    result: [{
      meta: { longName: name },
      timestamp: q.close.map((_, i) => 1_700_000_000 + i * 86_400),
      indicators: { quote: [q] },
    }],
  },
});

const bars = (n: number): Q => ({
  open: Array.from({ length: n }, (_, i) => 100 + i),
  high: Array.from({ length: n }, (_, i) => 101 + i),
  low: Array.from({ length: n }, (_, i) => 99 + i),
  close: Array.from({ length: n }, (_, i) => 100 + i),
  volume: Array.from({ length: n }, () => 1000),
});

const respond = (body: unknown, status = 200) =>
  vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status }));

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('yahoo provider', () => {
  it('asks for a range Yahoo will actually serve at each interval', async () => {
    // 1m past 8 days and 5m past a month are refused with 422, so the ranges
    // requested have to stay inside those limits.
    const seen: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (u: string) => {
      seen.push(String(u));
      return new Response(JSON.stringify(payload(bars(60))), { status: 200 });
    }));
    for (const iv of ['1m', '5m', '1h', '1d', '1wk'] as const) {
      await getCandles('AAPL', 'us', iv);
    }
    expect(seen.find((u) => u.includes('interval=1m'))).toContain('range=7d');
    expect(seen.find((u) => u.includes('interval=5m'))).toContain('range=1mo');
    expect(seen.find((u) => u.includes('interval=1h'))).toContain('range=3mo');
    expect(seen.find((u) => u.includes('interval=1d'))).toContain('range=2y');
    expect(seen.find((u) => u.includes('interval=1wk'))).toContain('range=10y');
  });

  it('drops the forming bar Yahoo pads with nulls', async () => {
    // Number(null) is 0 and isFinite(0) is true, so a naive parser keeps a bar
    // priced at zero — which produced "Last 0" charts and bogus verdicts.
    const q = bars(40);
    q.open.push(null); q.high.push(null); q.low.push(null); q.close.push(null); q.volume!.push(null);
    vi.stubGlobal('fetch', respond(payload(q)));
    const { candles } = await getCandles('AAPL', 'us', '1d');
    expect(candles).toHaveLength(40);
    expect(candles.every((c) => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0)).toBe(true);
  });

  it('rejects a series too short to analyse rather than returning a stub', async () => {
    vi.stubGlobal('fetch', respond(payload(bars(12))));
    await expect(getCandles('AAPL', 'us', '1d')).rejects.toThrow(/not enough history/i);
  });

  it('caps the series so every interval returns a comparable window', async () => {
    vi.stubGlobal('fetch', respond(payload(bars(900))));
    const { candles } = await getCandles('AAPL', 'us', '1d');
    expect(candles).toHaveLength(320);
    // The cap keeps the most recent bars, not the oldest.
    expect(candles.at(-1)!.close).toBe(100 + 899);
  });

  it('maps a bare crypto ticker to the pair Yahoo lists', async () => {
    const f = respond(payload(bars(40)));
    vi.stubGlobal('fetch', f);
    const { meta } = await getCandles('BTC', 'crypto', '1d');
    expect(meta.symbol).toBe('BTC-USD');
    expect(String(f.mock.calls[0]![0])).toContain('BTC-USD');
  });

  it('tries exchange suffixes for a bare global ticker and says which matched', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async (u: string) => {
      call++;
      // Bare symbol misses; the Tokyo suffix hits.
      if (String(u).includes('7203.T')) {
        return new Response(JSON.stringify(payload(bars(40))), { status: 200 });
      }
      return new Response('', { status: 404 });
    }));
    const { meta } = await getCandles('7203', 'global', '1d');
    expect(meta.symbol).toBe('7203.T');
    expect(meta.notice).toMatch(/Tokyo/);
    expect(call).toBeGreaterThan(1);
  });

  it('takes an explicit suffix as given, without guessing', async () => {
    const f = respond(payload(bars(40)));
    vi.stubGlobal('fetch', f);
    const { meta } = await getCandles('SAP.DE', 'global', '1d');
    expect(meta.symbol).toBe('SAP.DE');
    expect(meta.notice).toBeUndefined();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('advises the suffix when no exchange has a bare global symbol', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    await expect(getCandles('ZZZZ', 'global', '1d')).rejects.toThrow(/adding the suffix/i);
  });

  it('reports an unknown symbol as unknown', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    await expect(getCandles('NOPE', 'us', '1d')).rejects.toThrow(/no such symbol/i);
  });

  it('passes a rate limit up so the caller can fall back', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));
    await expect(getCandles('AAPL', 'us', '1d')).rejects.toThrow(/429/);
  });

  it('surfaces an error Yahoo reports inside a 200 body', async () => {
    vi.stubGlobal('fetch', respond({ chart: { error: { description: 'No data found, symbol may be delisted' } } }));
    await expect(getCandles('DEAD', 'us', '1d')).rejects.toThrow(/delisted/);
  });

  it('carries the company name through', async () => {
    vi.stubGlobal('fetch', respond(payload(bars(40), 'Apple Inc.')));
    const { meta } = await getCandles('AAPL', 'us', '1d');
    expect(meta.name).toBe('Apple Inc.');
    expect(meta.provider).toBe('yahoo');
  });
});
