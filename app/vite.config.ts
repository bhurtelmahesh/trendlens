import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * The shipped index.html carries a strict CSP whose connect-src only allows the
 * production Worker. In `vite dev` the app talks to a local Worker on :8787, so
 * drop the meta CSP for the dev server only (the build keeps it).
 */
function dropCspInDev(): Plugin {
  return {
    name: 'drop-csp-in-dev',
    apply: 'serve',
    transformIndexHtml: (html) =>
      html.replace(/\s*<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/i, ''),
  };
}

// Root ('/') for Cloudflare Pages; the repo name ('/trendlens/' etc.) for the
// GitHub Pages project site — the workflow sets VITE_BASE for that build.
/**
 * A production build with no VITE_API_BASE silently ships the localhost dev
 * fallback in `lib/api.ts`, and the deployed site then fails every request with
 * "Could not reach the market-data service". That shipped once; fail loudly instead.
 */
function requireApiBase() {
  return {
    name: 'require-api-base',
    apply: 'build' as const,
    configResolved(cfg: { env: Record<string, string> }) {
      if (!cfg.env.VITE_API_BASE) {
        throw new Error(
          'VITE_API_BASE is not set. A production build without it ships the ' +
            'localhost fallback. Set it in app/.env.production or the environment.',
        );
      }
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), dropCspInDev(), requireApiBase()],
});
