import { useCallback, useState } from 'react';
import type { AnalysisResult, CandlesResponse, Interval, Market } from '../../shared/types';
import { analyzeCandles } from './analysis/analyze';
import { Brief } from './components/Brief';
import { HonestyPanel } from './components/HonestyPanel';
import { PriceChart } from './components/PriceChart';
import { TickerForm } from './components/TickerForm';
import { ApiRequestError, fetchCandles } from './lib/api';
import './styles.css';

interface Loaded {
  data: CandlesResponse;
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
        const analysis = analyzeCandles(data.candles);
        setLoaded({ data, analysis, refPrice });
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
            candles={loaded.data.candles}
            analysis={loaded.analysis}
            refPrice={loaded.refPrice}
          />
          <Brief meta={loaded.data.meta} analysis={loaded.analysis} refPrice={loaded.refPrice} />
        </main>
      ) : null}

      <HonestyPanel />
    </div>
  );
}
