import type {
  ApiError,
  CandlesResponse,
  Interval,
  SearchResponse,
} from '../../shared/types';
import { corsHeaders } from './cors';
import { searchSymbols } from './providers/search';
import { getCandles } from './providers/yahoo';
import { parseCandlesQuery } from './validate';

interface Env {
  MARKET_RL?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
}

// Per-isolate fallback limiter (the [[ratelimits]] binding is primary).
const hits = new Map<string, number[]>();
function fallbackAllowed(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => t > now - windowMs)) hits.delete(k);
  return recent.length <= limit;
}

// Candle history barely changes intraday, so cache it hard. A day-old "backup"
// copy is kept separately and served if the live feed is rate-limited.
const CANDLES_TTL: Record<Interval, number> = { '1h': 120, '1d': 900, '1wk': 3600 };
const SEARCH_TTL = 600;
const BACKUP_TTL = 86_400;

function jsonResponse(body: unknown, status: number, cacheControl: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cacheControl },
  });
}

function ok(body: CandlesResponse | SearchResponse, ttl: number): Response {
  return jsonResponse(body, 200, `public, max-age=${ttl}, stale-while-revalidate=86400`);
}
function fail(error: string, status: number): Response {
  return jsonResponse({ error } satisfies ApiError, status, 'no-store');
}

function withCors(res: Response, origin: string | null): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = req.headers.get('Origin');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (req.method !== 'GET') return withCors(fail('Method not allowed.', 405), origin);

    const url = new URL(req.url);
    const isApi = url.pathname === '/api/candles' || url.pathname === '/api/search';

    // `caches` is absent in the local Node dev server — degrade gracefully.
    const cache = typeof caches !== 'undefined' ? caches.default : undefined;
    const keyFor = (suffix = '') =>
      new Request(`${url.origin}${url.pathname}${url.search}${suffix}`, { method: 'GET' });

    // Fresh-enough cache hit → skip Yahoo entirely.
    if (isApi && cache) {
      const hit = await cache.match(keyFor());
      if (hit) return withCors(hit, origin);
    }

    // Rate limit (only on a cache miss).
    const rlKey = req.headers.get('CF-Connecting-IP') || origin || 'anon';
    let limited = !fallbackAllowed(rlKey);
    if (!limited && env.MARKET_RL) {
      try {
        limited = !(await env.MARKET_RL.limit({ key: rlKey })).success;
      } catch {
        /* binding missing — fallback already applied */
      }
    }
    if (limited) {
      return new Response(
        JSON.stringify({ error: 'Rate limited. Try again shortly.' } satisfies ApiError),
        {
          status: 429,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Retry-After': '60' },
        },
      );
    }

    if (url.pathname === '/api/search') {
      const q = (url.searchParams.get('q') ?? '').slice(0, 48);
      const res = ok({ results: await searchSymbols(q) }, SEARCH_TTL);
      if (cache) ctx.waitUntil(cache.put(keyFor(), res.clone()));
      return withCors(res, origin);
    }

    if (url.pathname !== '/api/candles') return withCors(fail('Not found.', 404), origin);

    const parsed = parseCandlesQuery(url.searchParams);
    if (typeof parsed === 'string') return withCors(fail(parsed, 400), origin);

    try {
      const data = await getCandles(parsed.symbol, parsed.market, parsed.interval);
      const res = ok(data, CANDLES_TTL[parsed.interval]);
      if (cache) {
        ctx.waitUntil(cache.put(keyFor(), res.clone()));
        ctx.waitUntil(
          cache.put(
            keyFor('&_b=1'),
            jsonResponse(data, 200, `public, max-age=${BACKUP_TTL}`),
          ),
        );
      }
      return withCors(res, origin);
    } catch (err) {
      // Live feed failed (usually a Yahoo 429). Serve the day-old backup if we have one.
      if (cache) {
        const backup = await cache.match(keyFor('&_b=1'));
        if (backup) {
          const body = (await backup.json()) as CandlesResponse;
          body.meta.notice = 'The live feed is busy — showing the most recent cached data (up to a day old).';
          return withCors(ok(body, 120), origin);
        }
      }
      const message = err instanceof Error ? err.message : 'Market data lookup failed.';
      return withCors(fail(`Couldn't load ${parsed.symbol}: ${message}`, 502), origin);
    }
  },
};
