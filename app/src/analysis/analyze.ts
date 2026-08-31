import type { AnalysisResult, Band, Candle, Direction } from '../../../shared/types';
import { ema, emaPeriodFor, emaSlopePctPerBar, typicalBarMove } from './ema';
import { rSquared } from './rsquared';
import { classifyStructure, breakOfStructure } from './structure';
import { fractalSwings, lastSwings } from './swings';

// Slope thresholds are measured in "typical bar moves", not in raw %/bar.
// A fixed %/bar constant is meaningless across intervals: measured over seven
// liquid symbols the median EMA slope runs 0.0023%/bar at 1m and 0.674%/bar at
// 1wk — a 290x spread — so any constant either never fires at 1m or always
// fires at 1wk. Divided by each instrument's own median bar move the same
// figures collapse into 0.07-0.39, which is comparable. These values are the
// previous daily-tuned constants converted at the measured daily bar move
// (1.28%), so daily verdicts are essentially unchanged.
/** Drift below this share of a typical bar counts as "flat". */
const FLAT_SLOPE = 0.09;
/**
 * Drift above this share of a typical bar is decisively steep — enough for the
 * slope alone to carry the verdict when the swing structure is mixed. Measured
 * separation: noisy synthetic trends sit at 0.64 and 0.99, a noisy oscillation
 * at 0.18, and real daily symbols run 0.07-1.24 with a 0.39 median. Half a
 * typical bar of drift per bar splits those cleanly.
 */
const STEEP_SLOPE = 0.5;
/** Drift that maps to a full-strength slope score. */
const SLOPE_FULL_SCALE = 0.47;
/** "No clean trend" is never a high-conviction call. */
const RANGE_CONFIDENCE_CAP = 65;

export function confidenceBand(score: number): Band {
  if (score < 40) return 'Low';
  if (score <= 70) return 'Moderate';
  return 'High';
}

function directionFrom(
  slope: number,
  structureVote: number,
  bosVote: number,
): { direction: Direction; net: number; votes: number[] } {
  const votes = [
    slope > FLAT_SLOPE ? 1 : slope < -FLAT_SLOPE ? -1 : 0,
    structureVote,
    bosVote,
  ];
  const net = votes.reduce((s, v) => s + v, 0);
  let direction: Direction = 'range';
  if (net >= 2) direction = 'up';
  else if (net <= -2) direction = 'down';
  else if (net === 1 && slope > STEEP_SLOPE) direction = 'up';
  else if (net === -1 && slope < -STEEP_SLOPE) direction = 'down';
  return { direction, net, votes };
}

/**
 * Bars safe to compute on. A provider can still slip in a null/zero bar
 * (usually the forming one), and Number(null) is 0, which isFinite() accepts.
 * Exported so the chart plots exactly the series the analysis measured.
 */
export function usableCandles(input: Candle[]): Candle[] {
  return input.filter((c) =>
    [c.open, c.high, c.low, c.close].every((v) => Number.isFinite(v) && v > 0),
  );
}

export function analyzeCandles(input: Candle[]): AnalysisResult {
  const candles = usableCandles(input);
  const closes = candles.map((c) => c.close);
  const n = closes.length;
  if (n < 10) throw new Error('need at least 10 usable candles');

  const emaPeriod = emaPeriodFor(n);
  const emaSeries = ema(closes, emaPeriod);
  const slopePct = emaSlopePctPerBar(emaSeries, emaPeriod);
  // Express the slope on the instrument's own scale. A flat series has no
  // scale to divide by, and is flat by definition.
  const barMove = typicalBarMove(closes);
  const slope = barMove > 0 ? slopePct / barMove : 0;

  const { highs, lows } = fractalSwings(candles);
  const structure = classifyStructure(highs, lows);
  const bos = breakOfStructure(candles, highs, lows);
  const swings = lastSwings(candles);
  const trendFit = rSquared(closes.slice(-Math.min(n, 60)));

  const structureVote =
    structure === 'higher-highs-higher-lows' ? 1 : structure === 'lower-highs-lower-lows' ? -1 : 0;
  const bosVote = bos === 'bullish' ? 1 : bos === 'bearish' ? -1 : 0;
  const { direction, votes } = directionFrom(slope, structureVote, bosVote);

  const slopeScore = Math.min(1, Math.abs(slope) / SLOPE_FULL_SCALE);
  const nonZero = votes.filter((v) => v !== 0);
  const agreement = nonZero.length
    ? Math.abs(nonZero.reduce((s, v) => s + v, 0)) / nonZero.length
    : 0;

  let confidence: number;
  if (direction === 'range') {
    // Confidence that there is NO trend: flat EMA, mixed structure, poor linear fit.
    confidence = Math.round(
      100 *
        (0.4 * (1 - slopeScore) +
          0.3 * (structure === 'mixed' ? 1 : 0) +
          0.3 * (1 - Math.min(1, trendFit * 2))),
    );
    if (trendFit > 0.35) confidence = Math.min(confidence, 45); // a real trend is hiding here
    confidence = Math.min(confidence, RANGE_CONFIDENCE_CAP);
  } else {
    confidence = Math.round(
      100 *
        agreement *
        (0.4 * slopeScore +
          0.25 * (structure !== 'mixed' ? 1 : 0) +
          0.15 * (bos !== 'none' ? 1 : 0) +
          0.2 * trendFit),
    );
  }
  confidence = Math.max(3, Math.min(97, confidence));

  return {
    direction,
    confidence,
    band: confidenceBand(confidence),
    emaSlopePctPerBar: slopePct,
    typicalBarMove: barMove,
    slopeInBars: slope,
    emaPeriod,
    structure,
    breakOfStructure: bos,
    trendFit,
    lastSwingHigh: swings.high,
    lastSwingLow: swings.low,
    lastClose: closes[n - 1]!,
    candleCount: n,
  };
}
