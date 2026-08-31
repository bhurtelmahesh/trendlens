import type { Candle, SwingPoint } from '../../../shared/types';
import { fractalSwings } from './swings';

/**
 * Names the Smart Money Concepts patterns that are actually present in the
 * loaded bars, and links each to the plate in the guide that explains it.
 *
 * Everything here reports what the chart has already done. None of it forecasts:
 * "price swept the swing low and closed back above it" is an observation, while
 * "so it will go up" is not something these bars can support. Only concepts that
 * can be decided from OHLC without judgement are detected — order blocks,
 * inducement and breakers all require reading intent, so they stay in the guide.
 */
export interface SmcFinding {
  /** Short tag shown as a chip, e.g. "SWEEP". */
  tag: string;
  /** Full name, matching the guide. */
  name: string;
  /** What happened, in plain language, with the levels involved. */
  detail: string;
  /** Plate number in the guide (#c1..#c15). */
  plate: number;
  /** Which side of the book this favours structurally, if either. */
  lean: 'bullish' | 'bearish' | 'neutral';
}

const money = (n: number): string =>
  n >= 1000
    ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : n >= 1
      ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : n.toLocaleString(undefined, { maximumFractionDigits: 6 });

const ago = (bars: number): string =>
  bars === 0 ? 'on the latest bar' : bars === 1 ? 'one bar ago' : `${bars} bars ago`;

/** Swept a level if a bar traded through it but closed back on the original side. */
function sweep(
  candles: Candle[],
  level: number,
  side: 'low' | 'high',
  within: number,
): { index: number } | null {
  const from = Math.max(0, candles.length - within);
  for (let i = candles.length - 1; i >= from; i--) {
    const c = candles[i]!;
    const pierced = side === 'low' ? c.low < level : c.high > level;
    const reclaimed = side === 'low' ? c.close > level : c.close < level;
    if (pierced && reclaimed) return { index: i };
  }
  return null;
}

/**
 * A bar that pushed into a level and was pushed back: the wick on that side is
 * at least twice the body. This is the behaviour plate 7 calls the tell — a long
 * wick through a level rather than a close beyond it.
 */
function rejection(
  candles: Candle[],
  level: number,
  side: 'low' | 'high',
  within: number,
  tolerancePct: number,
): { index: number; ratio: number } | null {
  const from = Math.max(0, candles.length - within);
  for (let i = candles.length - 1; i >= from; i--) {
    const c = candles[i]!;
    const body = Math.abs(c.close - c.open);
    const wick = side === 'high' ? c.high - Math.max(c.open, c.close) : Math.min(c.open, c.close) - c.low;
    const reach = side === 'high' ? c.high : c.low;
    const near = level > 0 && (Math.abs(reach - level) / level) * 100 <= tolerancePct;
    if (!near || wick <= 0) continue;
    // A doji-ish bar has no body to compare against; require a real wick instead.
    const ratio = body > 0 ? wick / body : Infinity;
    if (ratio >= 2) return { index: i, ratio };
  }
  return null;
}

/** Most recent three-bar gap that price has not traded back into. */
function unfilledGap(
  candles: Candle[],
  within: number,
): { low: number; high: number; index: number; bullish: boolean } | null {
  const from = Math.max(1, candles.length - within);
  for (let i = candles.length - 2; i >= from + 1; i--) {
    const a = candles[i - 1]!;
    const c = candles[i + 1]!;
    const bullish = c.low > a.high;
    const bearish = c.high < a.low;
    if (!bullish && !bearish) continue;
    const low = bullish ? a.high : c.high;
    const high = bullish ? c.low : a.low;
    // Still unfilled only if nothing since has traded back through it.
    let filled = false;
    for (let j = i + 2; j < candles.length; j++) {
      const b = candles[j]!;
      if (b.low <= high && b.high >= low) { filled = true; break; }
    }
    if (!filled) return { low, high, index: i, bullish };
  }
  return null;
}

/** Two swings at nearly the same price — an advertised pool of stops. */
function equalPair(points: SwingPoint[], tolerancePct: number): [SwingPoint, SwingPoint] | null {
  const last = points.slice(-3);
  for (let i = last.length - 1; i > 0; i--) {
    const a = last[i - 1]!;
    const b = last[i]!;
    if (a.price > 0 && (Math.abs(b.price - a.price) / a.price) * 100 <= tolerancePct) {
      return [a, b];
    }
  }
  return null;
}

export function detectSmc(candles: Candle[]): SmcFinding[] {
  const out: SmcFinding[] = [];
  const n = candles.length;
  if (n < 20) return out;

  const { highs, lows } = fractalSwings(candles);
  const lastClose = candles[n - 1]!.close;
  const swingHigh = highs.at(-1);
  const swingLow = lows.at(-1);
  const WINDOW = Math.min(20, n);

  // --- Liquidity sweep (plate 7) -----------------------------------------
  if (swingLow) {
    const s = sweep(candles, swingLow.price, 'low', WINDOW);
    if (s) {
      out.push({
        tag: 'SWEEP',
        name: 'Liquidity sweep',
        plate: 7,
        lean: 'bullish',
        detail: `Price traded below the swing low at ${money(swingLow.price)} ${ago(n - 1 - s.index)} and closed back above it — the level was taken and given straight back.`,
      });
    }
  }
  if (swingHigh) {
    const s = sweep(candles, swingHigh.price, 'high', WINDOW);
    if (s) {
      out.push({
        tag: 'SWEEP',
        name: 'Liquidity sweep',
        plate: 7,
        lean: 'bearish',
        detail: `Price traded above the swing high at ${money(swingHigh.price)} ${ago(n - 1 - s.index)} and closed back below it — the level was taken and given straight back.`,
      });
    }
  }

  // --- Rejection at a level (plate 7 — the wick is the tell) --------------
  // Only reported when no sweep of that level was already reported: a sweep is
  // the stronger statement and saying both would be the same event twice.
  const sweptLow = out.some((f) => f.tag === 'SWEEP' && f.lean === 'bullish');
  const sweptHigh = out.some((f) => f.tag === 'SWEEP' && f.lean === 'bearish');
  if (swingHigh && !sweptHigh) {
    const r = rejection(candles, swingHigh.price, 'high', WINDOW, 0.4);
    if (r) {
      out.push({
        tag: 'REJECTION',
        name: 'Rejection at the swing high',
        plate: 7,
        lean: 'bearish',
        detail: `A bar ${ago(n - 1 - r.index)} reached the swing high near ${money(swingHigh.price)} and closed well back down, leaving an upper wick ${r.ratio === Infinity ? 'with no body at all' : `${r.ratio.toFixed(1)}x its body`}.`,
      });
    }
  }
  if (swingLow && !sweptLow) {
    const r = rejection(candles, swingLow.price, 'low', WINDOW, 0.4);
    if (r) {
      out.push({
        tag: 'REJECTION',
        name: 'Rejection at the swing low',
        plate: 7,
        lean: 'bullish',
        detail: `A bar ${ago(n - 1 - r.index)} reached the swing low near ${money(swingLow.price)} and closed well back up, leaving a lower wick ${r.ratio === Infinity ? 'with no body at all' : `${r.ratio.toFixed(1)}x its body`}.`,
      });
    }
  }

  // --- Break of structure / change of character (plates 1 and 2) ----------
  if (swingHigh && lastClose > swingHigh.price) {
    out.push({
      tag: 'BOS',
      name: 'Break of structure',
      plate: 1,
      lean: 'bullish',
      detail: `The last close is above the swing high at ${money(swingHigh.price)}.`,
    });
  } else if (swingLow && lastClose < swingLow.price) {
    out.push({
      tag: 'BOS',
      name: 'Break of structure',
      plate: 1,
      lean: 'bearish',
      detail: `The last close is below the swing low at ${money(swingLow.price)}.`,
    });
  }

  const twoLows = lows.slice(-2);
  const twoHighs = highs.slice(-2);
  if (twoLows.length === 2 && twoLows[1]!.price > twoLows[0]!.price && lastClose < twoLows[1]!.price) {
    out.push({
      tag: 'CHoCH',
      name: 'Change of character',
      plate: 2,
      lean: 'bearish',
      detail: `Lows had been rising, and the last close is back below the most recent higher low at ${money(twoLows[1]!.price)}.`,
    });
  }
  if (twoHighs.length === 2 && twoHighs[1]!.price < twoHighs[0]!.price && lastClose > twoHighs[1]!.price) {
    out.push({
      tag: 'CHoCH',
      name: 'Change of character',
      plate: 2,
      lean: 'bullish',
      detail: `Highs had been falling, and the last close is back above the most recent lower high at ${money(twoHighs[1]!.price)}.`,
    });
  }

  // --- Equal highs / lows (plate 6) --------------------------------------
  const eqh = equalPair(highs, 0.15);
  if (eqh) {
    out.push({
      tag: 'EQH',
      name: 'Equal highs',
      plate: 6,
      lean: 'neutral',
      detail: `Two swing highs sit within a fraction of a percent of each other, near ${money(eqh[1].price)}.`,
    });
  }
  const eql = equalPair(lows, 0.15);
  if (eql) {
    out.push({
      tag: 'EQL',
      name: 'Equal lows',
      plate: 6,
      lean: 'neutral',
      detail: `Two swing lows sit within a fraction of a percent of each other, near ${money(eql[1].price)}.`,
    });
  }

  // --- Fair value gap (plate 9) ------------------------------------------
  const gap = unfilledGap(candles, Math.min(40, n));
  if (gap) {
    out.push({
      tag: 'FVG',
      name: 'Fair value gap',
      plate: 9,
      lean: gap.bullish ? 'bullish' : 'bearish',
      detail: `An unfilled gap sits between ${money(gap.low)} and ${money(gap.high)}, left by a fast move ${ago(n - 1 - gap.index)} and not traded back into since.`,
    });
  }

  // --- Premium / discount (plate 15) -------------------------------------
  if (swingHigh && swingLow && swingHigh.price > swingLow.price) {
    const span = swingHigh.price - swingLow.price;
    const pos = (lastClose - swingLow.price) / span;
    if (pos >= 0 && pos <= 1) {
      const half = pos > 0.5 ? 'premium' : 'discount';
      out.push({
        tag: half === 'premium' ? 'PREMIUM' : 'DISCOUNT',
        name: 'Premium vs. discount',
        plate: 15,
        lean: 'neutral',
        detail: `The last close sits at ${Math.round(pos * 100)}% of the ${money(swingLow.price)}–${money(swingHigh.price)} range — the ${half} half.`,
      });
    }
  }

  return out;
}
