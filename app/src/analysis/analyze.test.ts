import { describe, expect, it } from 'vitest';
import type { Candle } from '../../../shared/types';
import { analyzeCandles } from './analyze';

/**
 * Deterministic bar-to-bar noise. Real series have a noise floor, and the
 * analysis measures drift against it — a perfectly smooth function has none, so
 * its "typical bar move" is just the drift and the ratio is ~1 whatever the
 * slope. These fixtures add noise so they exercise the same path real data does.
 */
function noise(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x7fffffff - 0.5;
  };
}

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
    const n = noise(7);
    const r = analyzeCandles(series((i) => 100 + i * 0.9 + Math.sin(i / 7) * 2 + n() * 3));
    expect(r.direction).toBe('up');
    expect(r.emaSlopePctPerBar).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(30);
  });

  it('calls a steady downtrend "down" with a negative EMA slope', () => {
    const n = noise(11);
    const r = analyzeCandles(series((i) => 300 - i * 0.9 + Math.sin(i / 6) * 2 + n() * 3));
    expect(r.direction).toBe('down');
    expect(r.emaSlopePctPerBar).toBeLessThan(0);
  });

  it('calls a flat oscillation "range" and never High', () => {
    const n = noise(23);
    const r = analyzeCandles(series((i) => 200 + Math.sin(i / 8) * 5 + n() * 3));
    expect(r.direction).toBe('range');
    expect(r.band).not.toBe('High');
    expect(r.confidence).toBeLessThanOrEqual(65);
  });

  // The point of measuring drift in typical-bar-moves: the same shape must read
  // the same whether its bars are minutes or weeks. With a raw %/bar threshold
  // it did not — measured across seven symbols the median EMA slope ran
  // 0.0023%/bar at 1m against 0.674%/bar at 1wk, so a fixed cutoff either never
  // fired at 1m or always fired at 1wk.
  it('reaches the same verdict when the same shape is scaled per bar', () => {
    const shape = (i: number, scale: number) => {
      const n = noise(31 + Math.round(scale * 1000));
      return 100 + i * 0.9 * scale + Math.sin(i / 7) * 2 * scale + n() * 3 * scale;
    };
    // A minute bar moves a fraction of what a weekly bar moves; same geometry.
    const fine = analyzeCandles(series((i) => shape(i, 0.02)));
    const coarse = analyzeCandles(series((i) => shape(i, 1)));
    expect(fine.direction).toBe(coarse.direction);
    expect(fine.structure).toBe(coarse.structure);
    // Raw %/bar differs by roughly the scale factor...
    expect(Math.abs(coarse.emaSlopePctPerBar)).toBeGreaterThan(
      Math.abs(fine.emaSlopePctPerBar) * 5,
    );
    // ...while the normalised figure stays comparable.
    expect(Math.abs(fine.slopeInBars - coarse.slopeInBars)).toBeLessThan(0.25);
  });

  it('treats a flat series as flat rather than dividing by zero', () => {
    const r = analyzeCandles(series(() => 150));
    expect(r.typicalBarMove).toBe(0);
    expect(r.slopeInBars).toBe(0);
    expect(r.direction).toBe('range');
    expect(Number.isFinite(r.confidence)).toBe(true);
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
