import type { Interval, Market } from '../../../shared/types';

interface Props {
  /** The interval actually on screen — read from the loaded data, not from intent. */
  current: Interval;
  market: Market;
  /** The interval being fetched right now, if any. */
  pending: Interval | null;
  busy: boolean;
  onPick: (interval: Interval) => void;
}

/**
 * How much history each choice shows. The worker returns the last 320 bars
 * whatever the interval, so the window varies enormously — worth saying, since
 * "1m" and "1wk" look equally innocent in a row of buttons.
 */
const COVERAGE: Record<Interval, string> = {
  '1m': 'the last 320 bars — about 5 hours of market time',
  '5m': 'the last 320 bars — about 27 hours of market time',
  '1h': 'the last 320 bars — about 13 days of market time',
  '1d': 'the last 320 sessions — about 15 months',
  '1wk': 'the last 320 weeks — about 6 years',
};

const ORDER: Interval[] = ['1m', '5m', '1h', '1d', '1wk'];

export function IntervalTabs({ current, market, pending, busy, onPick }: Props) {
  // merolagani serves daily bars only, so NEPSE has nothing to switch between.
  const nepse = market === 'nepse';

  return (
    <div className="ivtabs" role="group" aria-label="Chart interval">
      <span className="ivtabs-label">Interval</span>
      <div className="ivtabs-row">
        {ORDER.map((iv) => {
          const active = iv === current;
          const loading = iv === pending;
          const locked = nepse && iv !== '1d';
          return (
            <button
              key={iv}
              type="button"
              className={`ivtab${active ? ' active' : ''}${loading ? ' loading' : ''}`}
              aria-pressed={active}
              disabled={locked || busy || active}
              title={locked ? 'NEPSE data is daily only' : COVERAGE[iv]}
              onClick={() => onPick(iv)}
            >
              {iv}
            </button>
          );
        })}
      </div>
      <span className="ivtabs-note">
        {nepse ? 'NEPSE is daily only.' : COVERAGE[current]}
      </span>
    </div>
  );
}
