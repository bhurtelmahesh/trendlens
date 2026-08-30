import { describe, expect, it } from 'vitest';
import { corsHeaders } from './cors';

const acao = (origin: string | null) => corsHeaders(origin)['Access-Control-Allow-Origin'];

describe('corsHeaders', () => {
  it('echoes each production and dev origin', () => {
    for (const o of [
      'https://trendlens.pages.dev',
      'https://bhurtelmahesh.github.io',
      'https://trendlens.web.app',
      'https://trendlens.firebaseapp.com',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]) {
      expect(acao(o)).toBe(o);
    }
  });

  it('allows Cloudflare Pages preview deploys over https', () => {
    expect(acao('https://abc123.trendlens.pages.dev')).toBe('https://abc123.trendlens.pages.dev');
    expect(acao('http://abc123.trendlens.pages.dev')).toBeUndefined();
  });

  it('refuses look-alike hosts that merely end with the right text', () => {
    for (const o of [
      'https://trendlens.pages.dev.evil.com',
      'https://eviltrendlens.pages.dev',
      'https://trendlens.web.app.evil.com',
      'https://bhurtelmahesh.github.io.evil.com',
      'null',
      '',
    ]) {
      expect(acao(o)).toBeUndefined();
    }
  });

  it('refuses a missing or malformed origin', () => {
    expect(acao(null)).toBeUndefined();
    expect(acao('not a url')).toBeUndefined();
  });

  it('always varies on Origin so caches cannot cross-serve the header', () => {
    expect(corsHeaders(null).Vary).toBe('Origin');
    expect(corsHeaders('https://trendlens.pages.dev').Vary).toBe('Origin');
  });

  it('only ever advertises read methods', () => {
    expect(corsHeaders('https://trendlens.pages.dev')['Access-Control-Allow-Methods']).toBe(
      'GET, OPTIONS',
    );
  });
});
