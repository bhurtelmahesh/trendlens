import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { rateLimitKey } from './index';

/** A Cache API stand-in that honours max-age, so expiry can be exercised. */
function fakeCache() {
  const store = new Map<string, { body: string; headers: Headers; storedAt: number }>();
  let now = 1_000_000;
  return {
    // Move the cache clock and Date.now together. The worker stamps the backup
    // with Date.now and reports its age from the same source, so a fake cache
    // clock alone would expire entries while the reported age stayed at zero.
    // Only Date.now is spied; setTimeout is left alone so provider timeouts and
    // async scheduling behave normally.
    advance: (secs: number) => {
      now += secs * 1000;
      clockOffset += secs * 1000;
    },
    size: () => store.size,
    keys: () => [...store.keys()],
    api: {
      async match(req: Request) {
        const e = store.get(req.url);
        if (!e) return undefined;
        const maxAge = Number(/max-age=(\d+)/.exec(e.headers.get('Cache-Control') ?? '')?.[1] ?? 0);
        if ((now - e.storedAt) / 1000 > maxAge) { store.delete(req.url); return undefined; }
        return new Response(e.body, { headers: e.headers });
      },
      async put(req: Request, res: Response) {
        store.set(req.url, { body: await res.text(), headers: new Headers(res.headers), storedAt: now });
      },
    },
  };
}

/** A Yahoo chart payload with `n` well-formed bars. */
const chart = (n = 60, base = 100) => ({
  chart: {
    result: [{
      meta: { longName: 'Test Corp' },
      timestamp: Array.from({ length: n }, (_, i) => 1_700_000_000 + i * 86_400),
      indicators: { quote: [{
        open: Array.from({ length: n }, (_, i) => base + i),
        high: Array.from({ length: n }, (_, i) => base + i + 1),
        low: Array.from({ length: n }, (_, i) => base + i - 1),
        close: Array.from({ length: n }, (_, i) => base + i),
        volume: Array.from({ length: n }, () => 1000),
      }] },
    }],
  },
});

// Cloudflare keeps the request alive until every waitUntil promise settles, so
// the cache write has completed before the next request arrives. Collect them
// and await them, or the tests race the writes they are meant to observe.
const pending: Promise<unknown>[] = [];
const ctx = {
  waitUntil: (p: Promise<unknown>) => { pending.push(p); },
  passThroughOnException: () => {},
} as unknown as ExecutionContext;

const ORIGIN = 'https://trendlens.web.app';
const req = (qs: string, init?: RequestInit) =>
  new Request(`https://api.test/api/candles?${qs}`, {
    headers: { Origin: ORIGIN, 'CF-Connecting-IP': '203.0.113.' + Math.floor(Math.random() * 250) },
    ...init,
  });

/** Call the worker and let its background cache writes finish, as the platform would. */
async function call(qs: string, init?: RequestInit): Promise<Response> {
  const res = await worker.fetch(req(qs, init), {}, ctx);
  await Promise.all(pending.splice(0));
  return res;
}

let cache: ReturnType<typeof fakeCache>;
let clockOffset = 0;
const realNow = Date.now.bind(Date);

beforeEach(() => {
  pending.length = 0;
  clockOffset = 0;
  vi.spyOn(Date, 'now').mockImplementation(() => realNow() + clockOffset);
  cache = fakeCache();
  (globalThis as unknown as { caches: unknown }).caches = { default: cache.api };
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const okFetch = (payload: unknown = chart()) =>
  vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));

describe('worker: cache policy', () => {
  it('gives each interval a TTL matched to how fast its bars change', async () => {
    const expected: Record<string, number> = { '1m': 30, '5m': 60, '1h': 120, '1d': 900, '1wk': 3600 };
    for (const [iv, ttl] of Object.entries(expected)) {
      vi.stubGlobal('fetch', okFetch());
      const res = await call(`symbol=T${iv}&market=us&interval=${iv}`);
      expect(res.status, iv).toBe(200);
      expect(res.headers.get('Cache-Control'), iv).toContain(`max-age=${ttl}`);
    }
  });

  it('serves a second identical request from cache without calling the provider', async () => {
    const f = okFetch();
    vi.stubGlobal('fetch', f);
    await call('symbol=AAPL&market=us&interval=1d');
    const calls = f.mock.calls.length;
    await call('symbol=AAPL&market=us&interval=1d');
    expect(f.mock.calls.length).toBe(calls);
  });

  it('keys the cache on the full query, so a different interval is a different entry', async () => {
    vi.stubGlobal('fetch', okFetch());
    await call('symbol=AAPL&market=us&interval=1d');
    await call('symbol=AAPL&market=us&interval=1h');
    const primary = cache.keys().filter((k) => !k.includes('_b=1'));
    expect(new Set(primary).size).toBe(2);
  });
});

describe('worker: surviving a provider failure', () => {
  it('falls back to the last good copy and says how old it is', async () => {
    vi.stubGlobal('fetch', okFetch());
    await call('symbol=AAPL&market=us&interval=1d');

    // Past the 1d primary TTL (900s) so the live path is actually attempted,
    // but well inside the day-long budget for the fallback copy.
    cache.advance(1000);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 429 })));
    const res = await call('symbol=AAPL&market=us&interval=1d');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { meta: { notice?: string }; candles: unknown[] };
    expect(body.candles.length).toBeGreaterThan(0);
    expect(body.meta.notice).toMatch(/last good copy/i);
    expect(body.meta.notice).toMatch(/17 minutes ago/);
  });

  it('keeps an intraday fallback for minutes, not a day', async () => {
    vi.stubGlobal('fetch', okFetch());
    await call('symbol=AAPL&market=us&interval=1m');

    // Inside the 1m budget: still served.
    cache.advance(300);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 429 })));
    expect((await call('symbol=AAPL&market=us&interval=1m')).status).toBe(200);

    // Past it: a day-old minute chart must not be presented as current.
    cache.advance(1200);
    const stale = await call('symbol=AAPL&market=us&interval=1m');
    expect(stale.status).toBe(502);
  });

  it('explains a rate limit instead of quoting the status code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));
    const res = await call('symbol=NEW&market=us&interval=1d');
    const body = (await res.json()) as { error: string };
    expect(res.status).toBe(502);
    expect(body.error).toMatch(/rate-limiting/i);
    expect(body.error).not.toMatch(/provider returned/);
  });

  it('reports other provider failures plainly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    const body = (await call('symbol=NEW2&market=us&interval=1d').then((r) => r.json())) as { error: string };
    expect(body.error).toMatch(/Couldn't load NEW2/);
  });
});

describe('worker: request handling', () => {
  it('answers preflight, allows HEAD, refuses writes', async () => {
    vi.stubGlobal('fetch', okFetch());
    const opt = await call('symbol=A', { method: 'OPTIONS' });
    expect(opt.status).toBe(204);
    expect(opt.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

    expect((await call('symbol=AAPL&interval=1d', { method: 'HEAD' })).status).toBe(200);
    expect((await call('symbol=AAPL', { method: 'POST' })).status).toBe(405);
  });

  it('rejects a bad query before the provider is touched', async () => {
    const f = okFetch();
    vi.stubGlobal('fetch', f);
    const res = await call('symbol=AAPL&interval=1s');
    expect(res.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it('withholds the CORS header from an origin that is not allowed', async () => {
    vi.stubGlobal('fetch', okFetch());
    const r = new Request('https://api.test/api/candles?symbol=AAPL', {
      headers: { Origin: 'https://evil.example', 'CF-Connecting-IP': '203.0.113.9' },
    });
    const res = await worker.fetch(r, {}, ctx);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('identifies a caller for rate limiting, and declines to guess when it cannot', () => {
    expect(rateLimitKey(new Request('https://x/', { headers: { 'CF-Connecting-IP': '1.2.3.4' } }))).toBe('1.2.3.4');
    expect(rateLimitKey(new Request('https://x/', { headers: { 'X-Forwarded-For': '5.6.7.8, 9.9.9.9' } }))).toBe('5.6.7.8');
    // No identity: limiting everyone under one shared key would throttle all traffic together.
    expect(rateLimitKey(new Request('https://x/'))).toBeNull();
  });
});
