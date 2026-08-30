import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '../../../shared/types';
import { toBrief } from './brief';

const base: AnalysisResult = {
  direction: 'up',
  confidence: 60,
  band: 'Moderate',
  emaSlopePctPerBar: 0.4,
  emaPeriod: 20,
  structure: 'higher-highs-higher-lows',
  breakOfStructure: 'none',
  trendFit: 0.6,
  lastSwingHigh: { index: 100, price: 120 },
  lastSwingLow: { index: 80, price: 100 },
  candleCount: 200,
};

describe('toBrief reference line', () => {
  it('is absent without a reference price', () => {
    expect(toBrief(base).reference).toBeUndefined();
  });

  it('places a price inside the range', () => {
    expect(toBrief(base, 110).reference).toMatch(/inside the recent range/);
  });

  it('places a price below the swing low', () => {
    expect(toBrief(base, 90).reference).toMatch(/below the recent swing low/);
  });

  it('places a price above the swing high', () => {
    expect(toBrief(base, 130).reference).toMatch(/above the recent swing high/);
  });

  it('ignores a non-positive reference price', () => {
    expect(toBrief(base, 0).reference).toBeUndefined();
    expect(toBrief(base, Number.NaN).reference).toBeUndefined();
  });
});
