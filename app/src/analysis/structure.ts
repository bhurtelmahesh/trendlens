import type { BreakOfStructure, Candle, Structure, SwingPoint } from '../../../shared/types';

/** Compare the last two swing highs and last two swing lows. */
export function classifyStructure(highs: SwingPoint[], lows: SwingPoint[]): Structure {
  const h = highs.slice(-2);
  const l = lows.slice(-2);
  const higherHigh = h.length === 2 && h[1]!.price > h[0]!.price;
  const lowerHigh = h.length === 2 && h[1]!.price < h[0]!.price;
  const higherLow = l.length === 2 && l[1]!.price > l[0]!.price;
  const lowerLow = l.length === 2 && l[1]!.price < l[0]!.price;
  if (higherHigh && higherLow) return 'higher-highs-higher-lows';
  if (lowerHigh && lowerLow) return 'lower-highs-lower-lows';
  return 'mixed';
}

/**
 * Has the latest close pushed past the most recent confirmed swing?
 * `none` when there are no confirmed pivots to break.
 */
export function breakOfStructure(
  candles: Candle[],
  highs: SwingPoint[],
  lows: SwingPoint[],
): BreakOfStructure {
  const lastClose = candles.at(-1)?.close;
  if (lastClose === undefined) return 'none';
  const priorHigh = highs.at(-1)?.price;
  const priorLow = lows.at(-1)?.price;
  if (priorHigh !== undefined && lastClose > priorHigh) return 'bullish';
  if (priorLow !== undefined && lastClose < priorLow) return 'bearish';
  return 'none';
}
