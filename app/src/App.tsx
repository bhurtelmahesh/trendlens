import { useCallback, useState } from 'react';
import type { AnalysisResult, Candle, CandlesResponse, Interval, Market } from '../../shared/types';
import { analyzeCandles, usableCandles } from './analysis/analyze';
import { Brief } from './components/Brief';
import { EntryZones } from './components/EntryZones';
import { HonestyPanel } from './components/HonestyPanel';
import { Legal } from './components/Legal';
import { PriceChart } from './components/PriceChart';
import { TickerForm } from './components/TickerForm';
import { ApiRequestError, fetchCandles } from './lib/api';
import { nepseName } from './lib/nepse';
import './styles.css';

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

  const run = useCallback(
    async (symbol: string, market: Market, interval: Interval, refPrice?: number) => {
      setBusy(true);
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
      } catch (err) {
        setLoaded(null);
        setError(
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Something went wrong.',
        );
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return (
    <div className="app">
      <header className="masthead">
        <h1>TrendLens</h1>
        <p>See the structure of a price series &mdash; measured, not guessed.</p>
      </header>

      <TickerForm busy={busy} onSubmit={run} />

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {loaded ? (
        <main className="result">
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
          <EntryZones analysis={loaded.analysis} />
        </main>
      ) : null}

      <HonestyPanel />
      <Legal />
    </div>
  );
}
