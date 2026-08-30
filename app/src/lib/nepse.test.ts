import { describe, expect, it } from 'vitest';
import { searchNepseLocal } from './nepse';

describe('searchNepseLocal', () => {
  it('matches by symbol prefix', () => {
    const r = searchNepseLocal('NAB');
    expect(r.some((x) => x.symbol === 'NABIL')).toBe(true);
    expect(r.every((x) => x.market === 'nepse' && x.exchange === 'NEPSE')).toBe(true);
  });

  it('matches by name substring', () => {
    expect(searchNepseLocal('tamakoshi').some((x) => x.symbol === 'UPPER')).toBe(true);
  });

  it('returns a starter list for an empty query and caps results', () => {
    expect(searchNepseLocal('').length).toBeGreaterThan(0);
    expect(searchNepseLocal('a').length).toBeLessThanOrEqual(8);
  });

  it('returns nothing for a non-match', () => {
    expect(searchNepseLocal('ZZZQ')).toHaveLength(0);
  });
});
