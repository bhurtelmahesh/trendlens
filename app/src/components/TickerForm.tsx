import { useState } from 'react';
import type { Interval, Market } from '../../../shared/types';

interface Props {
  busy: boolean;
  onSubmit: (symbol: string, market: Market, interval: Interval) => void;
}

const EXAMPLES: Record<Market, string> = { us: 'AAPL, MSFT, NVDA', crypto: 'BTC, ETH, SOL', global: '7203.T, SAP.DE, BP.L' };

export function TickerForm({ busy, onSubmit }: Props) {
  const [symbol, setSymbol] = useState('AAPL');
  const [market, setMarket] = useState<Market>('us');
  const [interval, setInterval] = useState<Interval>('1d');

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        const s = symbol.trim().toUpperCase();
        if (s) onSubmit(s, market, interval);
      }}
    >
      <label className="field">
        <span>Ticker</span>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          maxLength={24}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={EXAMPLES[market]}
          aria-label="Ticker symbol"
        />
      </label>

      <label className="field">
        <span>Market</span>
        <select value={market} onChange={(e) => setMarket(e.target.value as Market)}>
          <option value="us">US stocks</option>
          <option value="crypto">Crypto</option>
          <option value="global">Other global</option>
        </select>
      </label>

      <label className="field">
        <span>Interval</span>
        <select value={interval} onChange={(e) => setInterval(e.target.value as Interval)}>
          <option value="1h">1 hour</option>
          <option value="1d">1 day</option>
          <option value="1wk">1 week</option>
        </select>
      </label>

      <button type="submit" disabled={busy}>
        {busy ? 'Reading…' : 'Read the structure'}
      </button>
      <p className="hint">Type the exact symbol. Examples for {market}: {EXAMPLES[market]}.</p>
    </form>
  );
}
