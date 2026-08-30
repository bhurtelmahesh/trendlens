import type { AnalysisResult, Candle } from '../../../shared/types';

export type ReferenceTone = 'aligned' | 'neutral' | 'against';

export interface ReferenceRead {
  text: string;
  tone: ReferenceTone;
}

export interface Brief {
  headline: string;
  summary: string;
  observations: string[];
  ifItHolds: string;
  ifItBreaks: string;
  reference?: ReferenceRead;
}

function money(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function moveSize(absPct: number): string {
  if (absPct < 3) return 'a small move';
  if (absPct < 10) return 'a moderate move';
  if (absPct < 25) return 'a large move';
  return 'a very large move';
}

const STRUCTURE_PHRASE: Record<AnalysisResult['structure'], string> = {
  'higher-highs-higher-lows': 'higher swing highs and higher swing lows',
  'lower-highs-lower-lows': 'lower swing highs and lower swing lows',
  mixed: 'swing highs and lows that are not consistently rising or falling',
};

/**
 * Whether a reference price is close enough to the plotted bars to draw on the
 * chart. One band of slack either side keeps a near-miss visible; beyond that
 * the line would squash the candles into a sliver. The chart and the brief both
 * call this, so they can never disagree about whether the line is shown.
 */
export function refOnChart(refPrice: number, candles: Candle[]): boolean {
  if (!Number.isFinite(refPrice) || candles.length === 0) return false;
  let low = Infinity;
  let high = -Infinity;
  for (const c of candles) {
    if (c.low < low) low = c.low;
    if (c.high > high) high = c.high;
  }
  const band = high - low || Math.abs(high) * 0.02 || 1;
  return refPrice >= low - band && refPrice <= high + band;
}

/**
 * Where a reference price sits versus the current structure, and whether the
 * trend is leaning toward it. Colour tone: aligned = with the trend,
 * against = the trend would have to turn first, neutral = no trend.
 */
export function describeReference(r: AnalysisResult, refPrice: number): ReferenceRead | undefined {
  if (!Number.isFinite(refPrice) || refPrice <= 0) return undefined;

  const gap = ((refPrice - r.lastClose) / r.lastClose) * 100;
  const p = money(refPrice);
  const hi = money(r.lastSwingHigh.price);
  const lo = money(r.lastSwingLow.price);

  const place =
    refPrice < r.lastSwingLow.price
      ? `below the swing low (${lo})`
      : refPrice > r.lastSwingHigh.price
        ? `above the swing high (${hi})`
        : `inside the recent range (${lo}–${hi})`;

  if (Math.abs(gap) < 0.3) {
    return {
      text: `${p} is about where price is now, ${place}.`,
      tone: 'neutral',
    };
  }

  const dirNeeded: 'up' | 'down' = gap > 0 ? 'up' : 'down';
  const size = moveSize(Math.abs(gap));
  const gapStr = `${gap > 0 ? '+' : ''}${gap.toFixed(1)}%`;
  const trend = r.direction === 'up' ? 'up-trend' : 'down-trend';

  let tone: ReferenceTone;
  let lean: string;
  if (r.direction === 'range') {
    tone = 'neutral';
    lean = "there's no trend leaning either way, so getting there is a coin toss";
  } else if (r.direction === dirNeeded) {
    tone = 'aligned';
    lean = `the current ${trend} is already heading that way`;
  } else {
    tone = 'against';
    lean = `the current ${trend} would have to stall or reverse first`;
  }

  return {
    text: `Reaching ${p} is ${size} ${dirNeeded} (${gapStr}), ${place} — ${lean}.`,
    tone,
  };
}

/** Turn the numeric result into plain, non-advice language. */
export function toBrief(r: AnalysisResult, refPrice?: number): Brief {
  const hi = money(r.lastSwingHigh.price);
  const lo = money(r.lastSwingLow.price);
  const slope = `${r.emaSlopePctPerBar >= 0 ? '+' : ''}${r.emaSlopePctPerBar.toFixed(3)}% per bar`;

  const headline =
    r.direction === 'up'
      ? 'Trending up'
      : r.direction === 'down'
        ? 'Trending down'
        : 'No clean trend';

  const emaWord =
    Math.abs(r.emaSlopePctPerBar) < 0.12
      ? 'roughly flat'
      : r.emaSlopePctPerBar > 0
        ? 'sloping up'
        : 'sloping down';

  const summary =
    r.direction === 'range'
      ? r.structure === 'mixed'
        ? `The ${r.emaPeriod}-bar EMA is ${emaWord} (${slope}) and the swing structure is mixed. There is no clear direction to read here.`
        : `The ${r.emaPeriod}-bar EMA is ${emaWord} (${slope}) while the swings show ${STRUCTURE_PHRASE[r.structure]}. The two don't agree, so there is no clear direction to read.`
      : `The ${r.emaPeriod}-bar EMA is ${emaWord} (${slope}) and price is printing ${STRUCTURE_PHRASE[r.structure]}.`;

  const observations = [
    `Swing structure: ${STRUCTURE_PHRASE[r.structure]}.`,
    `${r.emaPeriod}-bar EMA slope: ${slope}.`,
    r.breakOfStructure === 'none'
      ? `The last close sits between the recent swing low (${lo}) and swing high (${hi}) — no break of structure.`
      : `The last close has broken the recent swing ${r.breakOfStructure === 'bullish' ? `high (${hi})` : `low (${lo})`} — a ${r.breakOfStructure} break of structure.`,
    `Straight-line fit of recent closes: r² = ${r.trendFit.toFixed(2)} (${r.trendFit > 0.5 ? 'trend-like' : r.trendFit > 0.2 ? 'loose' : 'choppy'}).`,
  ];

  const ifItHolds =
    r.direction === 'down'
      ? `A close back above the swing high near ${hi} would break the sequence of lower highs.`
      : `Holding above the swing low near ${lo} keeps the current structure intact.`;
  const ifItBreaks =
    r.direction === 'up'
      ? `A decisive close below the swing low near ${lo} would end the sequence of higher lows.`
      : `Continued rejection below the swing high near ${hi} keeps pressure toward ${lo}.`;

  return {
    headline,
    summary,
    observations,
    ifItHolds,
    ifItBreaks,
    reference: refPrice === undefined ? undefined : describeReference(r, refPrice),
  };
}
