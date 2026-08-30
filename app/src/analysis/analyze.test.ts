import { describe, expect, it } from 'vitest';
import type { Candle } from '../../../shared/types';
import { analyzeCandles } from './analyze';

/** Build candles from a close-price function, with small wick padding. */
function series(fn: (i: number) => number, n = 160): Candle[] {
  const out: Candle[] = [];
  let t = Date.parse('2026-01-01T00:00:00Z');
  for (let i = 0; i < n; i++) {
    const open = fn(i);
    const close = fn(i + 0.5);
    const pad = Math.max(0.5, Math.abs(open) * 0.004);
    out.push({
      time: t,
      open,
      high: Math.max(open, close) + pad,
      low: Math.min(open, close) - pad,
      close,
      volume: 1000,
    });
    t += 3_600_000;
  }
  return out;
}

describe('analyzeCandles', () => {
  it('calls a steady uptrend "up" with a positive EMA slope', () => {
    const r = analyzeCandles(series((i) => 100 + i * 0.9 + Math.sin(i / 7) * 2));
    expect(r.direction).toBe('up');
    expect(r.emaSlopePctPerBar).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(30);
  });

  it('calls a steady downtrend "down" with a negative EMA slope', () => {
    const r = analyzeCandles(series((i) => 300 - i * 0.9 + Math.sin(i / 6) * 2));
    expect(r.direction).toBe('down');
    expect(r.emaSlopePctPerBar).toBeLessThan(0);
  });

  it('calls a flat oscillation "range" and never High', () => {
    const r = analyzeCandles(series((i) => 200 + Math.sin(i / 8) * 5));
    expect(r.direction).toBe('range');
    expect(r.band).not.toBe('High');
    expect(r.confidence).toBeLessThanOrEqual(65);
  });

  it('calls a choppy, directionless series "range"', () => {
    // Deterministic pseudo-random walk with strong mean reversion — no net drift.
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    let p = 200;
    const r = analyzeCandles(
      series((i) => {
        p += (rand() - 0.5) * 5 + (200 - p) * 0.15;
        return p + Math.sin(i / 4) * 1.5;
      }),
    );
    expect(r.direction).toBe('range');
    expect(r.band).not.toBe('High');
  });

  it('drops a trailing zero/null bar instead of trusting it', () => {
    const clean = series((i) => 100 + i * 0.9);
    const withPhantom: Candle[] = [
      ...clean,
      { time: clean.at(-1)!.time + 3_600_000, open: clean.at(-1)!.close, high: clean.at(-1)!.close, low: 0, close: 0, volume: 0 },
    ];
    const a = analyzeCandles(clean);
    const b = analyzeCandles(withPhantom);
    expect(b.candleCount).toBe(a.candleCount);
    expect(b.direction).toBe('up');
    expect(b.lastSwingLow.price).toBeGreaterThan(0);
  });

  it('reports swing levels that exist in the data', () => {
    const candles = series((i) => 150 + i * 0.5 + Math.sin(i / 5) * 8);
    const r = analyzeCandles(candles);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    expect(highs).toContain(r.lastSwingHigh.price);
    expect(lows).toContain(r.lastSwingLow.price);
    expect(r.lastSwingHigh.price).toBeGreaterThan(r.lastSwingLow.price);
  });

  it('throws on too little data', () => {
    expect(() => analyzeCandles(series((i) => 100 + i, 5))).toThrow();
  });
});
