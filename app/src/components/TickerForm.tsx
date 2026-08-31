import { useEffect, useId, useRef, useState } from 'react';
import type { Market, SearchResult } from '../../../shared/types';
import { peekSearch, searchSymbols } from '../lib/api';
import { searchNepseLocal } from '../lib/nepse';

interface Props {
  busy: boolean;
  /** Interval is chosen on the chart after loading, not here. */
  onSubmit: (symbol: string, market: Market, refPrice?: number) => void;
}

const EXAMPLES: Record<Market, string> = {
  us: 'AAPL, MSFT, NVDA',
  crypto: 'BTC, ETH, SOL',
  global: '7203.T, SAP.DE, BP.L',
  nepse: 'NABIL, UPPER, NRIC',
};

export function TickerForm({ busy, onSubmit }: Props) {
  const listId = useId();
  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState<Market>('us');
  const [refPrice, setRefPrice] = useState('');

  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const justPicked = useRef(false);
  const nepse = market === 'nepse';

  // Symbol search. NEPSE uses a bundled local list; everything else hits the
  // proxy — painting a cached guess first, then a short debounced fetch.
  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }

    if (nepse) {
      const local = searchNepseLocal(symbol);
      setResults(local);
      setActive(-1);
      setOpen(local.length > 0 && symbol.trim().length > 0);
      return;
    }

    if (symbol.trim().length < 2) {
      setResults([]);
      return;
    }

    const guess = peekSearch(symbol);
    if (guess && guess.length) {
      setResults(guess);
      setActive(-1);
      setOpen(true);
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const found = await searchSymbols(symbol, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setResults(found);
      setActive(-1);
      if (found.length) setOpen(true);
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [symbol, nepse]);

  function pick(r: SearchResult) {
    justPicked.current = true;
    setSymbol(r.symbol);
    setMarket(r.market);
    setOpen(false);
    setResults([]);
  }

  function submit(sym: string, mkt: Market) {
    const s = sym.trim().toUpperCase();
    if (!s || busy) return;
    const ref = Number.parseFloat(refPrice);
    onSubmit(s, mkt, Number.isFinite(ref) && ref > 0 ? ref : undefined);
  }

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (open && active >= 0 && results[active]) {
          const r = results[active];
          pick(r);
          submit(r.symbol, r.market);
        } else {
          submit(symbol, market);
        }
      }}
    >
      <label className="field combo">
        <span>Ticker</span>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!open || !results.length) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => (i + 1) % results.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => (i - 1 + results.length) % results.length);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          maxLength={24}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={EXAMPLES[market]}
          aria-label="Ticker symbol"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        />
        {open && results.length ? (
          <ul className="results" id={listId} role="listbox" aria-label="Matching symbols">
            {results.map((r, i) => (
              <li
                key={r.symbol}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : undefined}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r);
                }}
              >
                <b>{r.symbol}</b>
                <span>{r.name}</span>
                <em>{r.exchange}</em>
              </li>
            ))}
          </ul>
        ) : null}
        <span className="sr-only" role="status" aria-live="polite">
          {open && results.length ? `${results.length} matching symbol${results.length === 1 ? '' : 's'}` : ''}
        </span>
      </label>

      <label className="field">
        <span>Market</span>
        <select
          value={market}
          onChange={(e) => setMarket(e.target.value as Market)}
        >
          <option value="us">US stocks</option>
          <option value="crypto">Crypto</option>
          <option value="global">Other global</option>
          <option value="nepse">NEPSE (Nepal)</option>
        </select>
      </label>

      <label className="field">
        <span>
          Your price <small>optional</small>
        </span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={refPrice}
          onChange={(e) => setRefPrice(e.target.value)}
          placeholder="e.g. 180"
          aria-label="Your reference price (optional)"
        />
      </label>

      <button type="submit" disabled={busy || !symbol.trim()}>
        {busy ? 'Reading…' : 'Read the structure'}
      </button>
      <p className="hint">
        {nepse
          ? 'NEPSE support is experimental — unofficial daily data via merolagani. '
          : 'Start typing to search, or enter the exact symbol. Interval is set on the chart. '}
        Examples for {market}: {EXAMPLES[market]}.
      </p>
    </form>
  );
}
