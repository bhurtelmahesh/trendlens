import type { ApiError, CandlesResponse } from '../../shared/types';
import { corsHeaders } from './cors';
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

function json(body: CandlesResponse | ApiError, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
    },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (req.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, origin);

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
      return new Response(JSON.stringify({ error: 'Rate limited. Try again shortly.' } satisfies ApiError), {
        status: 429,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const url = new URL(req.url);
    if (url.pathname !== '/api/candles') return json({ error: 'Not found.' }, 404, origin);

    const parsed = parseCandlesQuery(url.searchParams);
    if (typeof parsed === 'string') return json({ error: parsed }, 400, origin);

    try {
      const data = await getCandles(parsed.symbol, parsed.market, parsed.interval);
      return json(data, 200, origin);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Market data lookup failed.';
      return json({ error: `Couldn't load ${parsed.symbol}: ${message}` }, 502, origin);
    }
  },
};
