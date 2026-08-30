import type { AnalysisResult } from '../../../shared/types';

export type ZoneSide = 'long' | 'short';

/**
 * How a side sits against the structure that was measured — NOT whether to
 * take it. `with` = the measured trend runs the same way as this side,
 * `against` = the trend would have to turn first, `neither` = no trend to lean on.
 */
export type ZoneStanding = 'with' | 'against' | 'neither';

export interface ZoneExit {
  /** Breaching this ends the structure the side depends on. */
  invalidation: number;
  /** The far side of the same structure — where the move runs out of range. */
  objective: number;
  /** % from the zone midpoint to the invalidation (always positive). */
  invalidationPct: number;
  /** % from the zone midpoint to the objective (always positive). */
  objectivePct: number;
  note: string;
}

export interface EntryZone {
  side: ZoneSide;
  /** Lower / upper bound of the zone, in price. */
  low: number;
  high: number;
  /** Midpoint — what the exit distances are measured from. */
  mid: number;
  standing: ZoneStanding;
  /** Is the last close inside this zone right now? */
  priceInZone: boolean;
  exit: ZoneExit;
  note: string;
}

export interface EntryZones {
  long: EntryZone;
  short: EntryZone;
  /** The swing range the zones are cut from. */
  rangeLow: number;
  rangeHigh: number;
}

/** Fraction of the swing range each zone occupies, measured from its edge. */
const ZONE_FRACTION = 1 / 3;

function standingFor(side: ZoneSide, direction: AnalysisResult['direction']): ZoneStanding {
  if (direction === 'range') return 'neither';
  const favours: ZoneSide = direction === 'up' ? 'long' : 'short';
  return side === favours ? 'with' : 'against';
}

function entryNote(side: ZoneSide, standing: ZoneStanding, priceInZone: boolean, above: boolean): string {
  const trend = side === 'long' ? 'up-trend' : 'down-trend';
  const where = priceInZone
    ? 'Price is inside this zone now'
    : above
      ? 'Price is above this zone'
      : 'Price is below this zone';

  if (standing === 'with') {
    return priceInZone
      ? `${where}, and the measured ${trend} runs the same way.`
      : `${where}. The measured ${trend} runs this way, but price has not come back to the zone.`;
  }
  if (standing === 'against') {
    const opposing = side === 'long' ? 'down-trend' : 'up-trend';
    return `${where}. This side runs against the measured ${opposing} — the structure would have to turn first.`;
  }
  return `${where}. There is no measured trend leaning either way, so this zone is only the ${
    side === 'long' ? 'lower' : 'upper'
  } third of the recent range.`;
}

// Deliberately no reward:risk ratio here. Measured from the midpoint of a
// third-of-range zone it is always 5:1 by construction — a constant of the
// geometry, not a property of the symbol. The two percentages below do vary,
// and they carry the information a ratio would only disguise.
function exitNote(side: ZoneSide): string {
  const brokenBy =
    side === 'long'
      ? 'a close below the swing low — the higher-low sequence is gone'
      : 'a close above the swing high — the lower-high sequence is gone';
  const runsOut =
    side === 'long'
      ? 'the swing high, where the range has been turning price back'
      : 'the swing low, where the range has been catching price';
  return `Structure is broken by ${brokenBy}. It runs out at ${runsOut}.`;
}

function pctFrom(mid: number, level: number): number {
  if (!(Math.abs(mid) > 0)) return 0;
  return Math.abs((level - mid) / mid) * 100;
}

/**
 * The thirds of the current swing range where each side would be structurally
 * consistent — a long near the swing low it depends on, a short near the swing
 * high — plus, for each, the level that ends that structure and the far side it
 * runs to. Purely geometric: it describes where each side's structure lives and
 * where it stops, and says plainly when the structure does not support the side
 * at all. Nothing here is a recommendation to trade.
 */
export function entryZones(r: AnalysisResult): EntryZones {
  const rangeHigh = Math.max(r.lastSwingHigh.price, r.lastSwingLow.price);
  const rangeLow = Math.min(r.lastSwingHigh.price, r.lastSwingLow.price);

  // Degenerate history (a flat series, or one swing point) still has to render.
  let band = rangeHigh - rangeLow;
  if (!(band > 0)) band = Math.abs(r.lastClose) * 0.02 || 1;

  const depth = band * ZONE_FRACTION;
  const bounds: Record<ZoneSide, { low: number; high: number }> = {
    long: { low: rangeLow, high: rangeLow + depth },
    short: { low: rangeHigh - depth, high: rangeHigh },
  };

  const build = (side: ZoneSide): EntryZone => {
    const z = bounds[side];
    const mid = (z.low + z.high) / 2;
    const standing = standingFor(side, r.direction);
    const priceInZone = r.lastClose >= z.low && r.lastClose <= z.high;
    const invalidation = side === 'long' ? rangeLow : rangeHigh;
    const objective = side === 'long' ? rangeHigh : rangeLow;
    const invalidationPct = pctFrom(mid, invalidation);
    const objectivePct = pctFrom(mid, objective);

    return {
      side,
      low: z.low,
      high: z.high,
      mid,
      standing,
      priceInZone,
      exit: {
        invalidation,
        objective,
        invalidationPct,
        objectivePct,
        note: exitNote(side),
      },
      note: entryNote(side, standing, priceInZone, r.lastClose > z.high),
    };
  };

  return { long: build('long'), short: build('short'), rangeLow, rangeHigh };
}
