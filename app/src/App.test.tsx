// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Candle, CandlesResponse, Interval, Market } from '../../shared/types';

// The chart needs a real canvas; the analysis under it is what these tests are about.
vi.mock('./components/PriceChart', () => ({ PriceChart: () => <div data-testid="chart" /> }));
const fetchCandles = vi.fn();
vi.mock('./lib/api', async () => {
  const actual = await vi.importActual<typeof import('./lib/api')>('./lib/api');
  return {
    ...actual,
    fetchCandles: (...a: unknown[]) => fetchCandles(...a),
    searchSymbols: vi.fn(async () => []),
    peekSearch: () => undefined,
  };
});

const { default: App } = await import('./App');

/** A rising series with enough bars for swings and structure. */
function candles(n = 80, base = 100): Candle[] {
  return Array.from({ length: n }, (_, i) => {
    const c = base + i * 0.8 + Math.sin(i / 5) * 2;
    return { time: Date.UTC(2026, 0, 1) + i * 86_400_000, open: c, high: c + 1, low: c - 1, close: c, volume: 1000 };
  });
}
const payload = (symbol: string, interval: Interval, market: Market = 'us'): CandlesResponse => ({
  meta: { symbol, name: `${symbol} Inc`, market, interval, provider: 'yahoo' },
  candles: candles(),
});

const LAST = 'trendlens:last-query';
beforeEach(() => { fetchCandles.mockReset(); sessionStorage.clear(); });
// Module-level spies keep their call history between tests, so a
// "never called" assertion would pass only in the declared order and
// fail under --sequence.shuffle.
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

const ticker = () => screen.getByRole('combobox', { name: /ticker symbol/i }) as HTMLInputElement;
const submit = () => screen.getByRole('button', { name: /read the structure/i }) as HTMLButtonElement;

async function search(symbol: string) {
  fireEvent.change(ticker(), { target: { value: symbol } });
  fireEvent.click(submit());
  await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: new RegExp(symbol) })).toBeTruthy());
}

describe('App: first visit', () => {
  it('starts with an empty ticker and no result', () => {
    render(<App />);
    expect(ticker().value).toBe('');
    expect(submit().disabled).toBe(true);
    expect(screen.queryByTestId('chart')).toBeNull();
  });

  it('explains why the button cannot be pressed yet', () => {
    render(<App />);
    expect(screen.getByText(/enter or pick a ticker to continue/i)).toBeTruthy();
  });

  it('keeps the form inside a main landmark before any result exists', () => {
    render(<App />);
    const main = screen.getByRole('main');
    expect(main.querySelector('form')).toBeTruthy();
  });

  it('analyses the symbol that was typed', async () => {
    fetchCandles.mockResolvedValue(payload('AAPL', '1d'));
    render(<App />);
    await search('AAPL');
    expect(fetchCandles).toHaveBeenCalledWith('AAPL', 'us', '1d');
    expect(screen.getByTestId('chart')).toBeTruthy();
  });
});

describe('App: returning from the tutorial', () => {
  it('restores the chart AND the inputs that produced it', async () => {
    // The bug this guards: the result came back while the form sat empty with
    // submit disabled, so nothing on screen said what had been analysed.
    sessionStorage.setItem(LAST, JSON.stringify({ symbol: 'NVDA', market: 'us', interval: '5m', refPrice: 310 }));
    fetchCandles.mockResolvedValue(payload('NVDA', '5m'));
    render(<App />);

    await waitFor(() => expect(screen.getByTestId('chart')).toBeTruthy());
    expect(fetchCandles).toHaveBeenCalledWith('NVDA', 'us', '5m');
    expect(ticker().value).toBe('NVDA');
    expect(submit().disabled).toBe(false);
    expect((screen.getByLabelText(/reference price/i) as HTMLInputElement).value).toBe('310');
  });

  it('does not open the suggestion list on a restored render', async () => {
    sessionStorage.setItem(LAST, JSON.stringify({ symbol: 'NVDA', market: 'us', interval: '1d' }));
    fetchCandles.mockResolvedValue(payload('NVDA', '1d'));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('chart')).toBeTruthy());
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('ignores a corrupt or half-written stored query', async () => {
    sessionStorage.setItem(LAST, '{not json');
    render(<App />);
    expect(ticker().value).toBe('');
    expect(fetchCandles).not.toHaveBeenCalled();
  });

  it('remembers the query after a successful analysis', async () => {
    fetchCandles.mockResolvedValue(payload('AAPL', '1d'));
    render(<App />);
    await search('AAPL');
    expect(JSON.parse(sessionStorage.getItem(LAST)!)).toMatchObject({ symbol: 'AAPL', interval: '1d' });
  });
});

describe('App: switching interval', () => {
  it('re-reads the same symbol on the chosen interval', async () => {
    fetchCandles.mockResolvedValue(payload('AAPL', '1d'));
    render(<App />);
    await search('AAPL');

    fetchCandles.mockResolvedValue(payload('AAPL', '1m'));
    fireEvent.click(screen.getByRole('button', { name: '1m' }));
    await waitFor(() => expect(fetchCandles).toHaveBeenLastCalledWith('AAPL', 'us', '1m'));
  });

  it('keeps the chart on screen when a switch fails', async () => {
    // Without this, changing timeframe on a working chart and hitting a network
    // error left an empty page.
    fetchCandles.mockResolvedValue(payload('AAPL', '1d'));
    render(<App />);
    await search('AAPL');

    fetchCandles.mockRejectedValue(new Error('Could not reach the market-data service.'));
    fireEvent.click(screen.getByRole('button', { name: '1wk' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByTestId('chart')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /AAPL/ })).toBeTruthy();
  });

  it('clears the result when a NEW search fails', async () => {
    fetchCandles.mockResolvedValue(payload('AAPL', '1d'));
    render(<App />);
    await search('AAPL');

    fetchCandles.mockRejectedValue(new Error('no such symbol: ZZZZ'));
    fireEvent.change(ticker(), { target: { value: 'ZZZZ' } });
    fireEvent.click(submit());
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByTestId('chart')).toBeNull();
  });

  it('forces NEPSE to daily, whatever was on screen before', async () => {
    fetchCandles.mockResolvedValue(payload('AAPL', '1m'));
    render(<App />);
    await search('AAPL');

    fetchCandles.mockResolvedValue(payload('NABIL', '1d', 'nepse'));
    fireEvent.change(screen.getByLabelText(/^market$/i) ?? screen.getAllByRole('combobox')[1]!, { target: { value: 'nepse' } });
    fireEvent.change(ticker(), { target: { value: 'NABIL' } });
    fireEvent.click(submit());
    await waitFor(() => expect(fetchCandles).toHaveBeenLastCalledWith('NABIL', 'nepse', '1d'));
  });
});
