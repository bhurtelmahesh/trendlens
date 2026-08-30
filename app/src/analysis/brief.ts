import type { AnalysisResult } from '../../../shared/types';

export interface Brief {
  headline: string;
  summary: string;
  observations: string[];
  ifItHolds: string;
  ifItBreaks: string;
  reference?: string;
}

function money(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

const STRUCTURE_PHRASE: Record<AnalysisResult['structure'], string> = {
  'higher-highs-higher-lows': 'higher swing highs and higher swing lows',
  'lower-highs-lower-lows': 'lower swing highs and lower swing lows',
  mixed: 'swing highs and lows that are not consistently rising or falling',
};

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

  let reference: string | undefined;
  if (refPrice !== undefined && Number.isFinite(refPrice) && refPrice > 0) {
    const p = money(refPrice);
    reference =
      refPrice < r.lastSwingLow.price
        ? `Your price (${p}) is below the recent swing low (${lo}) — under the current structure.`
        : refPrice > r.lastSwingHigh.price
          ? `Your price (${p}) is above the recent swing high (${hi}) — above the current structure.`
          : `Your price (${p}) sits inside the recent range, between the swing low (${lo}) and swing high (${hi}).`;
  }

  return { headline, summary, observations, ifItHolds, ifItBreaks, reference };
}
