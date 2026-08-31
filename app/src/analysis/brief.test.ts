import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '../../../shared/types';
import { describeReference, toBrief } from './brief';

const up: AnalysisResult = {
  direction: 'up',
  confidence: 60,
  band: 'Moderate',
  emaSlopePctPerBar: 0.4,
  typicalBarMove: 1.0,
  slopeInBars: 0.4,
  emaPeriod: 20,
  structure: 'higher-highs-higher-lows',
  breakOfStructure: 'none',
  trendFit: 0.6,
  lastSwingHigh: { index: 100, price: 120 },
  lastSwingLow: { index: 80, price: 100 },
  lastClose: 110,
  candleCount: 200,
};
const range: AnalysisResult = { ...up, direction: 'range', structure: 'mixed' };

describe('describeReference', () => {
  it('is undefined for a non-positive price', () => {
    expect(describeReference(up, 0)).toBeUndefined();
    expect(describeReference(up, Number.NaN)).toBeUndefined();
  });

  it('a higher target in an up-trend reads as aligned (green)', () => {
    const r = describeReference(up, 130)!;
    expect(r.tone).toBe('aligned');
    expect(r.text).toMatch(/above the swing high/);
    expect(r.text).toMatch(/up-trend is already heading that way/);
  });

  it('a lower target in an up-trend reads as against (red)', () => {
    const r = describeReference(up, 90)!;
    expect(r.tone).toBe('against');
    expect(r.text).toMatch(/below the swing low/);
    expect(r.text).toMatch(/would have to stall or reverse/);
  });

  it('any target with no trend reads as neutral (yellow)', () => {
    expect(describeReference(range, 130)!.tone).toBe('neutral');
    expect(describeReference(range, 90)!.tone).toBe('neutral');
  });

  it("a target at today's price is flagged as such", () => {
    expect(describeReference(up, 110.1)!.text).toMatch(/about where price is now/);
  });
});

  it('sizes a move against the range on screen, not a fixed percentage', () => {
    // Range is 100..120 on a 110 close — an 18.2% span.
    const near = describeReference(up, 118); // +7.3% => 0.4x the range
    const far = describeReference(up, 200); // +81.8% => 4.5x the range
    expect(near?.text).toContain('a small move');
    expect(far?.text).toContain('a very large move');

    // The same +7.3% on a chart whose whole visible span is 2% is not small.
    const tight: AnalysisResult = {
      ...up,
      lastSwingHigh: { index: 100, price: 111 },
      lastSwingLow: { index: 80, price: 109 },
    };
    expect(describeReference(tight, 118)?.text).toContain('a very large move');
  });

describe('toBrief', () => {
  it('omits the reference when no price is given', () => {
    expect(toBrief(up).reference).toBeUndefined();
  });
  it('includes a toned reference when a price is given', () => {
    expect(toBrief(up, 130).reference?.tone).toBe('aligned');
  });
});
