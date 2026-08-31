import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNepseCandles } from './merolagani';

/** merolagani answers in TradingView's UDF shape. */
const udf = (n: number, s: 'ok' | 'no_data' | 'error' = 'ok') => ({
  s,
  t: Array.from({ length: n }, (_, i) => 1_700_000_000 + i * 86_400),
  o: Array.from({ length: n }, (_, i) => 500 + i),
  h: Array.from({ length: n }, (_, i) => 505 + i),
  l: Array.from({ length: n }, (_, i) => 495 + i),
  c: Array.from({ length: n }, (_, i) => 502 + i),
  v: Array.from({ length: n }, () => 100),
});
const respond = (b: unknown, status = 200) =>
  vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
    new Response(JSON.stringify(b), { status }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('merolagani provider', () => {
  it('parses the UDF arrays into candles', async () => {
    vi.stubGlobal('fetch', respond(udf(60)));
    const { meta, candles } = await getNepseCandles('NABIL');
    expect(candles).toHaveLength(60);
    expect(meta.provider).toBe('merolagani');
    expect(meta.interval).toBe('1d');
    expect(candles[0]!.time).toBe(1_700_000_000 * 1000);
  });

  it('always says the data is unofficial', async () => {
    vi.stubGlobal('fetch', respond(udf(60)));
    const { meta } = await getNepseCandles('NABIL');
    expect(meta.notice).toMatch(/unofficial/i);
  });

  it('sends the referer the endpoint expects', async () => {
    const f = respond(udf(60));
    vi.stubGlobal('fetch', f);
    await getNepseCandles('NABIL');
    const init = f.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Referer).toContain('merolagani.com');
    expect(String(f.mock.calls[0]![0])).toContain('resolution=D');
  });

  it('drops bars with a non-positive price', async () => {
    const d = udf(40);
    d.t.push(1_800_000_000); d.o.push(0); d.h.push(0); d.l.push(0); d.c.push(0); d.v.push(0);
    vi.stubGlobal('fetch', respond(d));
    const { candles } = await getNepseCandles('NABIL');
    expect(candles).toHaveLength(40);
  });

  it('sorts by time even if the feed does not', async () => {
    const d = udf(40);
    d.t.reverse();
    vi.stubGlobal('fetch', respond(d));
    const { candles } = await getNepseCandles('NABIL');
    const times = candles.map((c) => c.time);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('distinguishes an unlisted symbol from an unavailable feed', async () => {
    vi.stubGlobal('fetch', respond({ s: 'no_data' }));
    await expect(getNepseCandles('NOPE')).rejects.toThrow(/no NEPSE listing/i);
    vi.stubGlobal('fetch', respond({ s: 'error' }));
    await expect(getNepseCandles('NABIL')).rejects.toThrow(/unavailable/i);
  });

  it('rejects a series too short to analyse', async () => {
    vi.stubGlobal('fetch', respond(udf(12)));
    await expect(getNepseCandles('NABIL')).rejects.toThrow(/not enough/i);
  });

  it('reports a transport failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    await expect(getNepseCandles('NABIL')).rejects.toThrow(/503/);
  });
});
