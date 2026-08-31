import type { Candle } from '../../../shared/types';
import { detectSmc } from '../analysis/smc';

interface Props {
  candles: Candle[];
  /** Where the guide lives; plate anchors hang off it. */
  guideHref: string;
}

const LEAN_LABEL = {
  bullish: 'favours the upside',
  bearish: 'favours the downside',
  neutral: 'context, neither side',
} as const;

/**
 * The same patterns the tutorial teaches, named where they appear on this chart.
 * Each one states what price did and links to the plate that explains it.
 * Nothing here says what happens next — that is the tutorial's point too.
 */
export function SmcNotes({ candles, guideHref }: Props) {
  const findings = detectSmc(candles);
  if (findings.length === 0) return null;

  return (
    <section className="smc" aria-label="Smart Money Concepts on this chart">
      <header className="smc-head">
        <h3>In Smart Money Concepts terms</h3>
        <p>
          What these bars have already done, named. Not a forecast &mdash; each entry links to
          the plate in the <a href={guideHref}>tutorial</a> that explains the idea.
        </p>
      </header>
      <ul className="smc-list">
        {findings.map((f, i) => (
          <li key={`${f.tag}-${f.lean}-${i}`} className={`smc-item lean-${f.lean}`}>
            <a className="smc-tag" href={`${guideHref}#c${f.plate}`}>
              {f.tag}
            </a>
            <div className="smc-body">
              <p className="smc-name">
                {f.name} <span className="smc-lean">{LEAN_LABEL[f.lean]}</span>
              </p>
              <p className="smc-detail">{f.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
