// The app runs on these origins. Everything else gets no
// Access-Control-Allow-Origin header (browsers then block the response).
const ALLOWED = new Set([
  'https://trendlens.pages.dev',
  'https://bhurtelmahesh.github.io',
  'https://trendlens.web.app',
  'https://trendlens.firebaseapp.com',
  'https://chartlens101.web.app',
  'https://chartlens101.firebaseapp.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

/** Also allow Cloudflare Pages preview deploys: <hash>.trendlens.pages.dev */
function isAllowed(origin: string): boolean {
  if (ALLOWED.has(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === 'https:' && hostname.endsWith('.trendlens.pages.dev');
  } catch {
    return false;
  }
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (origin && isAllowed(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}
