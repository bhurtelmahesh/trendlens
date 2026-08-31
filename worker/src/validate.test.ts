import { describe, expect, it } from 'vitest';
import { parseCandlesQuery } from './validate';

const q = (s: string) => parseCandlesQuery(new URLSearchParams(s));

describe('parseCandlesQuery', () => {
  it('applies the documented defaults', () => {
    expect(q('symbol=AAPL')).toEqual({ symbol: 'AAPL', market: 'us', interval: '1d' });
  });

  it('upper-cases the symbol and trims it', () => {
    expect(q('symbol=+aapl+')).toMatchObject({ symbol: 'AAPL' });
  });

  it('accepts every supported market and interval', () => {
    for (const m of ['us', 'crypto', 'global', 'nepse']) {
      expect(q(`symbol=X&market=${m}`)).toMatchObject({ market: m });
    }
    for (const i of ['1m', '5m', '1h', '1d', '1wk']) {
      expect(q(`symbol=X&interval=${i}`)).toMatchObject({ interval: i });
    }
  });

  it('accepts the punctuation real symbols use', () => {
    for (const s of ['BRK-B', '7203.T', '^GSPC', 'BTC-USD', 'EURUSD=X']) {
      expect(q(`symbol=${encodeURIComponent(s)}`)).toMatchObject({ symbol: s });
    }
  });

  it('rejects a missing or empty symbol', () => {
    expect(typeof q('')).toBe('string');
    expect(typeof q('symbol=')).toBe('string');
    expect(typeof q('symbol=+++')).toBe('string');
  });

  it('rejects a symbol over the length cap', () => {
    expect(typeof q(`symbol=${'A'.repeat(25)}`)).toBe('string');
    expect(q(`symbol=${'A'.repeat(24)}`)).toMatchObject({ symbol: 'A'.repeat(24) });
  });

  // The regex is the injection boundary: whatever survives here is
  // interpolated into a provider URL.
  it('rejects characters that could escape into a provider URL', () => {
    for (const bad of ['AA PL', 'AAPL/../x', 'AAPL?x=1', 'AAPL&x=1', 'AAPL#f', 'A<B', 'A%00', 'AAPL:80']) {
      expect(typeof q(`symbol=${encodeURIComponent(bad)}`)).toBe('string');
    }
  });

  it('rejects unsupported markets and intervals', () => {
    expect(typeof q('symbol=AAPL&market=moon')).toBe('string');
    expect(typeof q('symbol=AAPL&interval=2h')).toBe('string');
    expect(typeof q('symbol=AAPL&interval=1D')).toBe('string');
    // Yahoo has no sub-minute data; these must never reach the provider.
    expect(typeof q('symbol=AAPL&interval=1s')).toBe('string');
    expect(typeof q('symbol=AAPL&interval=30s')).toBe('string');
    expect(typeof q('symbol=AAPL&interval=15m')).toBe('string');
  });

  it('is case-insensitive on market but not on interval', () => {
    expect(q('symbol=AAPL&market=US')).toMatchObject({ market: 'us' });
    expect(typeof q('symbol=AAPL&interval=1WK')).toBe('string');
  });
});
