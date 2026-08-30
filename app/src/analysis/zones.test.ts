import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '../../../shared/types';
import { entryZones } from './zones';

/** A minimal AnalysisResult; only the fields entryZones reads matter. */
function result(over: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    direction: 'up',
    confidence: 60,
    band: 'Moderate',
    emaSlopePctPerBar: 0.3,
    emaPeriod: 10,
    structure: 'higher-highs-higher-lows',
    breakOfStructure: 'none',
    trendFit: 0.6,
    lastSwingHigh: { index: 90, price: 200 },
    lastSwingLow: { index: 60, price: 100 },
    lastClose: 150,
    candleCount: 100,
    ...over,
  } as AnalysisResult;
}

describe('entryZones', () => {
  it('cuts each zone from the correct third of the swing range', () => {
    const z = entryZones(result());
    expect(z.rangeLow).toBe(100);
    expect(z.rangeHigh).toBe(200);
    // range 100 wide, a third is ~33.33
    expect(z.long.low).toBeCloseTo(100);
    expect(z.long.high).toBeCloseTo(133.33, 1);
    expect(z.short.low).toBeCloseTo(166.67, 1);
    expect(z.short.high).toBeCloseTo(200);
    expect(z.long.high).toBeLessThan(z.short.low); // zones never overlap
  });

  it('orients each side to the swing it depends on', () => {
    const z = entryZones(result());
    expect(z.long.exit.invalidation).toBe(100); // below the swing low
    expect(z.long.exit.objective).toBe(200); // up to the swing high
    expect(z.short.exit.invalidation).toBe(200);
    expect(z.short.exit.objective).toBe(100);
  });

  it('reads standing from the measured direction, both sides', () => {
    const up = entryZones(result({ direction: 'up' }));
    expect(up.long.standing).toBe('with');
    expect(up.short.standing).toBe('against');

    const down = entryZones(result({ direction: 'down' }));
    expect(down.long.standing).toBe('against');
    expect(down.short.standing).toBe('with');

    const range = entryZones(result({ direction: 'range' }));
    expect(range.long.standing).toBe('neither');
    expect(range.short.standing).toBe('neither');
  });

  it('detects whether the last close is inside a zone', () => {
    expect(entryZones(result({ lastClose: 110 })).long.priceInZone).toBe(true);
    expect(entryZones(result({ lastClose: 110 })).short.priceInZone).toBe(false);
    expect(entryZones(result({ lastClose: 190 })).short.priceInZone).toBe(true);
    expect(entryZones(result({ lastClose: 150 })).long.priceInZone).toBe(false);
  });

  it('measures exit distances from the zone midpoint', () => {
    const z = entryZones(result());
    // long mid ≈ 116.67 → invalidation 100 is ≈14.3% away, objective 200 ≈71.4%
    expect(z.long.mid).toBeCloseTo(116.67, 1);
    expect(z.long.exit.invalidationPct).toBeCloseTo(14.29, 1);
    expect(z.long.exit.objectivePct).toBeCloseTo(71.43, 1);
  });

  // The ratio of those two distances is fixed by the zone geometry (always
  // 5:1 from the midpoint), so it is deliberately not reported as a finding.
  it('does not present a reward:risk ratio', () => {
    const z = entryZones(result());
    expect(z.long.exit).not.toHaveProperty('ratio');
    for (const side of [z.long, z.short]) {
      expect(side.exit.note).not.toMatch(/×|ratio|:1/);
    }
  });

  it('always reports positive distances, on both sides', () => {
    const z = entryZones(result());
    for (const side of [z.long, z.short]) {
      expect(side.exit.invalidationPct).toBeGreaterThan(0);
      expect(side.exit.objectivePct).toBeGreaterThan(0);
    }
  });

  it('never claims a trend is behind a side when there is none', () => {
    const z = entryZones(result({ direction: 'range' }));
    for (const side of [z.long, z.short]) {
      expect(side.note).toContain('no measured trend');
      expect(side.note).not.toContain('runs the same way');
    }
  });

  it('says the structure must turn first for a counter-trend side', () => {
    expect(entryZones(result({ direction: 'up' })).short.note).toContain('turn first');
    expect(entryZones(result({ direction: 'down' })).long.note).toContain('turn first');
  });

  it('survives a degenerate range without NaN or Infinity', () => {
    const flat = entryZones(result({
      lastSwingHigh: { index: 90, price: 50 },
      lastSwingLow: { index: 60, price: 50 },
      lastClose: 50,
    }));
    for (const side of [flat.long, flat.short]) {
      for (const v of [side.low, side.high, side.mid, side.exit.invalidationPct, side.exit.objectivePct]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('tolerates swings arriving high-low inverted', () => {
    const z = entryZones(result({
      lastSwingHigh: { index: 90, price: 100 },
      lastSwingLow: { index: 60, price: 200 },
    }));
    expect(z.rangeLow).toBe(100);
    expect(z.rangeHigh).toBe(200);
    expect(z.long.low).toBeLessThan(z.short.low);
  });
});
