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
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), dropCspInDev()],
});
