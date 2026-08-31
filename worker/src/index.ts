import type {
  ApiError,
  CandlesResponse,
  Interval,
  SearchResponse,
} from '../../shared/types';
import { corsHeaders } from './cors';
import { getNepseCandles } from './providers/merolagani';
import { searchSymbols } from './providers/search';
import { getCandles } from './providers/yahoo';
import { parseCandlesQuery } from './validate';

interface Env {
  MARKET_RL?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
}

/**
 * Who to rate-limit as. Cloudflare always sets CF-Connecting-IP in production,
 * so a miss means we are off-Cloudflare (the local Node dev server). Returning
 * null there means "don't limit" — the alternative, bucketing every caller
 * under one shared key, would throttle all traffic at 60/min collectively,
 * turning a missing header into a self-inflicted global outage.
 */
export function rateLimitKey(req: Request): string | null {
  const direct = req.headers.get('CF-Connecting-IP');
  if (direct) return direct.trim() || null;
  const forwarded = req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim();
  return forwarded || null;
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

// Cache TTLs track how fast a bar can change: a 1m chart goes stale in seconds,
// a weekly one does not. A day-old "backup" copy is kept separately and served
// if the live feed is rate-limited.
const CANDLES_TTL: Record<Interval, number> = {
  '1m': 30,
  '5m': 60,
  '1h': 120,
  '1d': 900,
  '1wk': 3600,
};

/**
 * How old a fallback copy may be before it is worse than an error, per interval.
 * Yahoo rate-limits bursts and recovers within moments; without a fallback a
 * single 429 is a dead end. A day-old daily chart is a reasonable stand-in, a
 * day-old one-minute chart is not — but a few minutes old is fine, and far
 * better than failing.
 */
const BACKUP_MAX_AGE: Record<Interval, number> = {
  '1m': 600,
  '5m': 1_800,
  '1h': 21_600,
  '1d': 86_400,
  '1wk': 86_400,
};
/** Header stamped on the fallback copy so its age can be reported honestly. */
const FETCHED_AT = 'X-Fetched-At';
const SEARCH_TTL = 3600;

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
    // HEAD is handled like GET; the runtime drops the body on the way out.
    // Uptime monitors and prefetchers use it, and 405ing them is just noise.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return withCors(fail('Method not allowed.', 405), origin);
    }

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

    // Rate limit (only on a cache miss, and only when we can identify a caller).
    const rlKey = rateLimitKey(req);
    let limited = rlKey !== null && !fallbackAllowed(rlKey);
    if (!limited && rlKey !== null && env.MARKET_RL) {
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
      const data =
        parsed.market === 'nepse'
          ? await getNepseCandles(parsed.symbol)
          : await getCandles(parsed.symbol, parsed.market, parsed.interval);
      const res = ok(data, CANDLES_TTL[data.meta.interval]);
      if (cache) {
        ctx.waitUntil(cache.put(keyFor(), res.clone()));
        const backup = jsonResponse(
          data,
          200,
          `public, max-age=${BACKUP_MAX_AGE[data.meta.interval]}`,
        );
        backup.headers.set(FETCHED_AT, String(Date.now()));
        ctx.waitUntil(cache.put(keyFor('&_b=1'), backup));
      }
      return withCors(res, origin);
    } catch (err) {
      // Live feed failed — usually a Yahoo 429, which clears in moments. Serve
      // the last good copy if it is still recent enough for this interval, and
      // say exactly how old it is rather than implying it is current.
      if (cache) {
        const backup = await cache.match(keyFor('&_b=1'));
        if (backup) {
          const body = (await backup.json()) as CandlesResponse;
          const stamp = Number(backup.headers.get(FETCHED_AT) ?? 0);
          const ageSec = stamp > 0 ? Math.round((Date.now() - stamp) / 1000) : null;
          const age =
            ageSec === null
              ? 'a moment'
              : ageSec < 90
                ? `${ageSec} seconds`
                : `${Math.round(ageSec / 60)} minutes`;
          body.meta.notice = `The live feed is busy — this is the last good copy, fetched ${age} ago.`;
          return withCors(ok(body, 60), origin);
        }
      }
      const raw = err instanceof Error ? err.message : 'Market data lookup failed.';
      // "provider returned 429" is accurate and tells a reader nothing.
      const message = /\b429\b/.test(raw)
        ? `The market-data provider is rate-limiting requests right now. Try ${parsed.symbol} again in a few seconds.`
        : `Couldn't load ${parsed.symbol}: ${raw}`;
      return withCors(fail(message, 502), origin);
    }
  },
};
