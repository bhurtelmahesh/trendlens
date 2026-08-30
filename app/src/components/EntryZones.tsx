import type { AnalysisResult } from '../../../shared/types';
import { entryZones, type EntryZone } from '../analysis/zones';

interface Props {
  analysis: AnalysisResult;
}

function money(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

const STANDING_LABEL = {
  with: 'With the structure',
  against: 'Against the structure',
  neither: 'No structure either way',
} as const;

function Zone({ zone }: { zone: EntryZone }) {
  const title = zone.side === 'long' ? 'Long side' : 'Short side';
  return (
    <div className={`zone zone-${zone.standing}`}>
      <header className="zone-head">
        <h4>{title}</h4>
        <span className={`zone-tag tag-${zone.standing}`}>{STANDING_LABEL[zone.standing]}</span>
      </header>

      <dl className="zone-levels">
        <div>
          <dt>Zone</dt>
          <dd>
            {money(zone.low)} – {money(zone.high)}
            {zone.priceInZone ? <span className="zone-here">price here now</span> : null}
          </dd>
        </div>
        <div>
          <dt>Structure breaks</dt>
          <dd className="lvl-out">
            {money(zone.exit.invalidation)}{' '}
            <small>({zone.exit.invalidationPct.toFixed(1)}% away)</small>
          </dd>
        </div>
        <div>
          <dt>Range runs out</dt>
          <dd className="lvl-obj">
            {money(zone.exit.objective)}{' '}
            <small>({zone.exit.objectivePct.toFixed(1)}% away)</small>
          </dd>
        </div>
      </dl>

      <p className="zone-note">{zone.note}</p>
      <p className="zone-note zone-exit">{zone.exit.note}</p>
    </div>
  );
}

/**
 * The thirds of the swing range where each side is structurally consistent,
 * with the level that ends that structure and the far side it runs to.
 * Descriptive geometry — deliberately not phrased as a call to trade.
 */
export function EntryZones({ analysis }: Props) {
  const zones = entryZones(analysis);

  return (
    <section className="zones" aria-label="Structural zones">
      <header className="zones-head">
        <h3>Where each side has structure behind it</h3>
        <p>
          The recent swing range ({money(zones.rangeLow)} – {money(zones.rangeHigh)}) cut into
          thirds. These are zones and levels, <strong>not signals</strong> — nothing here says to
          take a position, and being &ldquo;with the structure&rdquo; is not a forecast.
        </p>
      </header>

      <div className="zone-grid">
        <Zone zone={zones.long} />
        <Zone zone={zones.short} />
      </div>
    </section>
  );
}
