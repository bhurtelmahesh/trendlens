import type { AnalysisResult, CandlesMeta } from '../../../shared/types';
import { toBrief } from '../analysis/brief';

interface Props {
  meta: CandlesMeta;
  analysis: AnalysisResult;
  refPrice?: number;
}

export function Brief({ meta, analysis, refPrice }: Props) {
  const brief = toBrief(analysis, refPrice);
  const dirClass = `dir dir-${analysis.direction}`;

  return (
    <section className="brief" aria-label="Analysis brief">
      <header className="brief-head">
        <div>
          <h2>
            {meta.symbol}
            <span className="brief-sub">
              {meta.name ? ` · ${meta.name}` : ''} · {meta.interval}
            </span>
          </h2>
          <p className={dirClass}>{brief.headline}</p>
        </div>
        <div className="confidence" title="An agreement score across EMA slope, swing structure and break-of-structure. Not a probability.">
          <span className="conf-num">{analysis.confidence}</span>
          <span className={`conf-band band-${analysis.band.toLowerCase()}`}>{analysis.band}</span>
          <span className="conf-label">confidence</span>
        </div>
      </header>

      <p className="brief-summary">{brief.summary}</p>

      <ul className="brief-obs">
        {brief.observations.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ul>

      <div className="scenarios">
        <div className="scenario">
          <h3>If the structure holds</h3>
          <p>{brief.ifItHolds}</p>
        </div>
        <div className="scenario">
          <h3>If the structure breaks</h3>
          <p>{brief.ifItBreaks}</p>
        </div>
      </div>

      {brief.reference ? (
        <p className={`reference reference-${brief.reference.tone}`}>{brief.reference.text}</p>
      ) : null}
      {meta.notice ? <p className="notice">{meta.notice}</p> : null}
    </section>
  );
}
