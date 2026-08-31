import { describe, expect, it } from 'vitest';
import type { Candle } from '../../../shared/types';
import { detectSmc } from './smc';

/** Bars from explicit OHLC, so each fixture states exactly what it means. */
const bar = (o: number, h: number, l: number, c: number): Omit<Candle, 'time'> => ({
  open: o, high: h, low: l, close: c, volume: 1000,
});
const stamp = (rows: Omit<Candle, 'time'>[]): Candle[] =>
  rows.map((r, i) => ({ ...r, time: Date.parse('2026-01-01T00:00:00Z') + i * 3_600_000 }));

/** A calm baseline that produces confirmed swing pivots to work against. */
function base(): Omit<Candle, 'time'>[] {
  const rows: Omit<Candle, 'time'>[] = [];
  for (let i = 0; i < 30; i++) {
    const p = 100 + Math.sin(i / 3) * 4;
    rows.push(bar(p, p + 1, p - 1, p));
  }
  return rows;
}
const tags = (c: Candle[]) => detectSmc(c).map((f) => f.tag);

describe('detectSmc', () => {
  it('says nothing when there is not enough history to be sure', () => {
    expect(detectSmc(stamp(base().slice(0, 12)))).toEqual([]);
  });

  it('names a sweep when a level is pierced and given straight back', () => {
    const rows = base();
    const low = Math.min(...rows.map((r) => r.low));
    // Drive well under the lowest low, then close back above it.
    rows.push(bar(low + 1, low + 1.5, low - 4, low + 1.2));
    rows.push(bar(low + 1.2, low + 3, low + 1, low + 2.8));
    const f = detectSmc(stamp(rows)).find((x) => x.tag === 'SWEEP');
    expect(f).toBeDefined();
    expect(f!.lean).toBe('bullish');
    expect(f!.plate).toBe(7);
    expect(f!.detail).toMatch(/closed back above it/);
  });

  it('names a rejection from the wick when the level was not actually taken', () => {
    const rows = base();
    const high = Math.max(...rows.map((r) => r.high));
    // Approach the high without exceeding it: piercing would make this a sweep,
    // which is the stronger reading and would suppress the rejection.
    rows.push(bar(high - 3, high - 0.05, high - 3.4, high - 3.2));
    const f = detectSmc(stamp(rows)).find((x) => x.tag === 'REJECTION');
    expect(f).toBeDefined();
    expect(f!.lean).toBe('bearish');
    expect(f!.detail).toMatch(/upper wick/);
  });

  it('does not report a rejection and a sweep for the same event', () => {
    const rows = base();
    const low = Math.min(...rows.map((r) => r.low));
    rows.push(bar(low + 1, low + 1.5, low - 4, low + 1.2));
    const t = tags(stamp(rows));
    expect(t.filter((x) => x === 'SWEEP').length).toBe(1);
    // The same bar is a bullish sweep, so no bullish rejection alongside it.
    const both = detectSmc(stamp(rows)).filter((f) => f.lean === 'bullish' && ['SWEEP', 'REJECTION'].includes(f.tag));
    expect(both).toHaveLength(1);
  });

  it('names a break of structure when the close clears the swing', () => {
    const rows = base();
    const high = Math.max(...rows.map((r) => r.high));
    rows.push(bar(high, high + 5, high - 0.5, high + 4));
    const f = detectSmc(stamp(rows)).find((x) => x.tag === 'BOS');
    expect(f).toBeDefined();
    expect(f!.lean).toBe('bullish');
    expect(f!.plate).toBe(1);
  });

  it('names an unfilled gap and drops it once price trades back in', () => {
    const rows = base();
    const p = rows.at(-1)!.close;
    rows.push(bar(p, p + 1, p - 1, p));            // candle 1
    rows.push(bar(p, p + 12, p, p + 11));          // the impulse
    rows.push(bar(p + 11, p + 13, p + 9, p + 12)); // candle 3 — low above candle 1 high
    const open = detectSmc(stamp(rows)).find((x) => x.tag === 'FVG');
    expect(open).toBeDefined();
    expect(open!.plate).toBe(9);
    // The gap left by the impulse, between candle 1's high and candle 3's low.
    expect(open!.detail).toContain(String(Math.round(p + 9)));

    // Trading back through it must retire that gap. The baseline has small gaps
    // of its own, so assert this one is gone rather than that none remain.
    const filled = [...rows, bar(p + 12, p + 12, p - 1, p)];
    const after = detectSmc(stamp(filled)).find((x) => x.tag === 'FVG');
    expect(after?.detail ?? '').not.toContain(String(Math.round(p + 9)));
  });

  it('ignores a gap too small to be worth naming', () => {
    const rows = base();
    const p = rows.at(-1)!.close;
    // Bars that miss each other by a fraction of a cent are not a fair value
    // gap; reporting one rendered as "a gap between 219.01 and 219.01" live.
    rows.push(bar(p, p + 1, p - 1, p));
    rows.push(bar(p, p + 1.004, p, p + 1.003));
    rows.push(bar(p + 1.003, p + 1.01, p + 1.0005, p + 1.008));
    const f = detectSmc(stamp(rows)).find((x) => x.tag === 'FVG');
    // Either no gap, or one big enough that its two edges are distinguishable.
    if (f) {
      const nums = f.detail.match(/between ([\d.,]+) and ([\d.,]+)/);
      expect(nums).not.toBeNull();
      expect(nums![1]).not.toBe(nums![2]);
    }
  });

  it('reports which half of the range price sits in', () => {
    const f = detectSmc(stamp(base())).find((x) => x.tag === 'PREMIUM' || x.tag === 'DISCOUNT');
    expect(f).toBeDefined();
    expect(f!.plate).toBe(15);
    expect(f!.detail).toMatch(/% of the/);
  });

  it('only ever reports what happened, never what will happen', () => {
    const rows = base();
    const low = Math.min(...rows.map((r) => r.low));
    rows.push(bar(low + 1, low + 1.5, low - 4, low + 1.2));
    for (const f of detectSmc(stamp(rows))) {
      expect(f.detail).not.toMatch(/will|should|expect|likely|going to|predict/i);
    }
  });
});
