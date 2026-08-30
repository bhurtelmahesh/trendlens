import type { Candle, SwingPoint } from '../../../shared/types';

/**
 * Fractal swing pivots: a bar whose high is strictly above (or low strictly
 * below) every one of its `k` neighbours on each side. The most recent `k`
 * bars can never be pivots — they aren't confirmed yet.
 */
export function fractalSwings(
  candles: Candle[],
  k = 3,
): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];
  for (let i = k; i < candles.length - k; i++) {
    const bar = candles[i]!;
    let isHigh = true;
    let isLow = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      if (candles[j]!.high >= bar.high) isHigh = false;
      if (candles[j]!.low <= bar.low) isLow = false;
    }
    if (isHigh) highs.push({ index: i, price: bar.high });
    if (isLow) lows.push({ index: i, price: bar.low });
  }
  return { highs, lows };
}

/** The most recent confirmed swing high and low (with a candle-extremes fallback). */
export function lastSwings(candles: Candle[]): { high: SwingPoint; low: SwingPoint } {
  const { highs, lows } = fractalSwings(candles);
  const lastIndex = candles.length - 1;
  return {
    high: highs.at(-1) ?? { index: lastIndex, price: Math.max(...candles.map((c) => c.high)) },
    low: lows.at(-1) ?? { index: lastIndex, price: Math.min(...candles.map((c) => c.low)) },
  };
}
