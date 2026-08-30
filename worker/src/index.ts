import type { ApiError, CandlesResponse, SearchResponse } from '../../shared/types';
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

const CANDLES_TTL = 60; // seconds
const SEARCH_TTL = 300;

/** A payload response with no CORS — CORS is per-origin and added on the way out. */
function payload(
  body: CandlesResponse | SearchResponse | ApiError,
  status: number,
  ttl: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? `public, max-age=${ttl}` : 'no-store',
    },
  });
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
    if (req.method !== 'GET') return withCors(payload({ error: 'Method not allowed.' }, 405, 0), origin);

    const url = new URL(req.url);
    const isApi = url.pathname === '/api/candles' || url.pathname === '/api/search';

    // --- edge cache: same symbol/interval within the TTL skips Yahoo entirely,
    //     which is also what keeps us under Yahoo's rate limit under load.
    //     (`caches` is absent in the local Node dev server — degrade gracefully.) ---
    const cache = typeof caches !== 'undefined' ? caches.default : undefined;
    const cacheKey = new Request(`${url.origin}${url.pathname}${url.search}`, { method: 'GET' });
    if (isApi && cache) {
      const hit = await cache.match(cacheKey);
      if (hit) return withCors(hit, origin);
    }

    // --- rate limit (only on a cache miss) ---
    const key = req.headers.get('CF-Connecting-IP') || origin || 'anon';
    let limited = !fallbackAllowed(key);
    if (!limited && env.MARKET_RL) {
      try {
        limited = !(await env.MARKET_RL.limit({ key })).success;
      } catch {
        /* binding missing — fallback already applied */
      }
    }
    if (limited) {
      const res = new Response(JSON.stringify({ error: 'Rate limited. Try again shortly.' } satisfies ApiError), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
      return withCors(res, origin);
    }

    let res: Response;
    if (url.pathname === '/api/search') {
      const q = (url.searchParams.get('q') ?? '').slice(0, 48);
      res = payload({ results: await searchSymbols(q) }, 200, SEARCH_TTL);
    } else if (url.pathname === '/api/candles') {
      const parsed = parseCandlesQuery(url.searchParams);
      if (typeof parsed === 'string') {
        res = payload({ error: parsed }, 400, 0);
      } else {
        try {
          res = payload(await getCandles(parsed.symbol, parsed.market, parsed.interval), 200, CANDLES_TTL);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Market data lookup failed.';
          res = payload({ error: `Couldn't load ${parsed.symbol}: ${message}` }, 502, 0);
        }
      }
    } else {
      res = payload({ error: 'Not found.' }, 404, 0);
    }

    if (isApi && cache && res.status === 200) ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return withCors(res, origin);
  },
};
