import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Root ('/') for Cloudflare Pages; the repo name ('/trendlens/' etc.) for the
// GitHub Pages project site — the workflow sets VITE_BASE for that build.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
});
