import { useEffect, useRef, useState } from 'react';
import type { AnalysisResult, Candle, CandlesResponse, Interval, Market } from '../../shared/types';
import { analyzeCandles, usableCandles } from './analysis/analyze';
import { Brief } from './components/Brief';
import { EntryZones } from './components/EntryZones';
import { HonestyPanel } from './components/HonestyPanel';
import { IntervalTabs } from './components/IntervalTabs';
import { Legal } from './components/Legal';
import { PriceChart } from './components/PriceChart';
import { SmcNotes } from './components/SmcNotes';
import { TickerForm } from './components/TickerForm';
import { ApiRequestError, fetchCandles } from './lib/api';
import { nepseName } from './lib/nepse';
import './styles.css';

/**
 * The last query, kept for the tab's lifetime. Following a concept link to the
 * guide is a full page load, so returning lands on a fresh app with an empty
 * form and the analysis gone. Storing the query — not the result — lets the
 * same view be rebuilt on the way back; the worker edge-caches the response, so
 * it costs one cheap request.
 */
const LAST_QUERY = 'trendlens:last-query';

interface StoredQuery {
  symbol: string;
  market: Market;
  interval: Interval;
  refPrice?: number;
}

function readLastQuery(): StoredQuery | null {
  try {
    const raw = sessionStorage.getItem(LAST_QUERY);
    if (!raw) return null;
    const q = JSON.parse(raw) as Partial<StoredQuery>;
    if (typeof q.symbol !== 'string' || !q.symbol || !q.market || !q.interval) return null;
    return q as StoredQuery;
  } catch {
    // Private mode, blocked storage, or corrupt JSON — start clean.
    return null;
  }
}

interface Loaded {
  data: CandlesResponse;
  /** The bars the analysis actually measured — what the chart plots too. */
  candles: Candle[];
  analysis: AnalysisResult;
  refPrice?: number;
}

export default function App() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  /** The interval a *new* search uses; follows whatever was last loaded. */
  const [pref, setPref] = useState<Interval>('1d');
  /** The interval being fetched right now, for the tab's loading state. */
  const [pending, setPending] = useState<Interval | null>(null);
  /** Inputs to seed the form with when restoring; read once, before first paint. */
  const [initialInputs] = useState(() => {
    const q = readLastQuery();
    return q ? { symbol: q.symbol, market: q.market, refPrice: q.refPrice } : undefined;
  });

  async function load(
    symbol: string,
    market: Market,
    interval: Interval,
    refPrice?: number,
    // A failed interval switch must not throw away the chart being viewed; a
    // failed new search should clear it.
    opts?: { keepOnError?: boolean },
  ) {
    setBusy(true);
    setPending(interval);
    setError(null);
    try {
      const data = await fetchCandles(symbol, market, interval);
      // merolagani's feed carries no company name; fill it from the bundled list.
      if (data.meta.market === 'nepse' && !data.meta.name) {
        data.meta.name = nepseName(data.meta.symbol);
      }
      // Filter once, so the chart plots exactly what the analysis measured.
      const candles = usableCandles(data.candles);
      const analysis = analyzeCandles(candles);
      setLoaded({ data, candles, analysis, refPrice });
      setPref(data.meta.interval);
      try {
        const q: StoredQuery = {
          symbol: data.meta.symbol,
          market: data.meta.market,
          interval: data.meta.interval,
          refPrice,
        };
        sessionStorage.setItem(LAST_QUERY, JSON.stringify(q));
      } catch {
        // Storage unavailable; restoring on return is a convenience, not a need.
      }
    } catch (err) {
      if (!opts?.keepOnError) setLoaded(null);
      setError(
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong.',
      );
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  // Rebuild the last view when the tab comes back from the guide. Runs once.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const q = readLastQuery();
    if (q) load(q.symbol, q.market, q.interval, q.refPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new search keeps whatever interval is on screen, except NEPSE, which
  // merolagani only serves daily.
  const search = (symbol: string, market: Market, refPrice?: number) =>
    load(symbol, market, market === 'nepse' ? '1d' : pref, refPrice);

  const switchInterval = (interval: Interval) => {
    if (!loaded) return;
    const { symbol, market } = loaded.data.meta;
    load(symbol, market, interval, loaded.refPrice, { keepOnError: true });
  };

  return (
    <div className="app">
      <header className="masthead">
        <h1>TrendLens</h1>
        <p>See the structure of a price series &mdash; measured, not guessed.</p>
      </header>

      <main className="app-main">
        <h2 className="sr-only">Analyse a price series</h2>
        <TickerForm busy={busy} onSubmit={search} initial={initialInputs} />

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {loaded ? (
          <section className="result" aria-label="Analysis">
            <IntervalTabs
            current={loaded.data.meta.interval}
            market={loaded.data.meta.market}
            pending={pending}
            busy={busy}
            onPick={switchInterval}
          />
            <PriceChart
            candles={loaded.candles}
            analysis={loaded.analysis}
            refPrice={loaded.refPrice}
          />
            <Brief
            meta={loaded.data.meta}
            candles={loaded.candles}
            analysis={loaded.analysis}
            refPrice={loaded.refPrice}
          />
            <SmcNotes candles={loaded.candles} guideHref={`${import.meta.env.BASE_URL}guide.html`} />
            <EntryZones analysis={loaded.analysis} />
          </section>
        ) : null}
      </main>

      <HonestyPanel />
      <Legal />
    </div>
  );
}
