// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { SearchResult } from '../../../shared/types';

const searchSymbols = vi.fn(async (_query: string, _signal?: AbortSignal) => [] as SearchResult[]);
vi.mock('../lib/api', () => ({
  searchSymbols: (query: string, signal?: AbortSignal) => searchSymbols(query, signal),
  peekSearch: () => undefined,
}));
const { TickerForm } = await import('./TickerForm');

// Module-level spies keep their call history between tests, so a
// "never called" assertion would pass only in the declared order and
// fail under --sequence.shuffle.
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
const ticker = () => screen.getByRole('combobox', { name: /ticker symbol/i }) as HTMLInputElement;
const submit = () =>
  screen.getAllByRole('button').find((b) => (b as HTMLButtonElement).type === 'submit') as HTMLButtonElement;
const form = () => ticker().closest('form')!;

describe('TickerForm', () => {
  it('starts empty so the suggestion list does not cover the page', () => {
    render(<TickerForm busy={false} onSubmit={vi.fn()} />);
    expect(ticker().value).toBe('');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(searchSymbols).not.toHaveBeenCalled();
  });

  it('offers the ticker examples for the chosen market as a placeholder', () => {
    render(<TickerForm busy={false} onSubmit={vi.fn()} />);
    expect(ticker().placeholder).toMatch(/AAPL/);
  });

  it('does not submit an empty or blank ticker', () => {
    const onSubmit = vi.fn();
    render(<TickerForm busy={false} onSubmit={onSubmit} />);
    expect(submit().disabled).toBe(true);
    fireEvent.change(ticker(), { target: { value: '   ' } });
    expect(submit().disabled).toBe(true);
    fireEvent.submit(form());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('normalises the symbol and passes the reference price when given', () => {
    const onSubmit = vi.fn();
    render(<TickerForm busy={false} onSubmit={onSubmit} />);
    fireEvent.change(ticker(), { target: { value: ' aapl ' } });
    fireEvent.change(screen.getByLabelText(/reference price/i), { target: { value: '190' } });
    fireEvent.submit(form());
    expect(onSubmit).toHaveBeenCalledWith('AAPL', 'us', 190);
  });

  it('omits a reference price that is not a usable number', () => {
    const onSubmit = vi.fn();
    render(<TickerForm busy={false} onSubmit={onSubmit} />);
    fireEvent.change(ticker(), { target: { value: 'AAPL' } });
    fireEvent.change(screen.getByLabelText(/reference price/i), { target: { value: '-5' } });
    // Submit the form directly: a click races the debounced suggestion effect.
    fireEvent.submit(form());
    expect(onSubmit).toHaveBeenCalledWith('AAPL', 'us', undefined);
  });

  it('seeds from a restored query without opening the suggestion list', async () => {
    render(<TickerForm busy={false} onSubmit={vi.fn()} initial={{ symbol: 'NVDA', market: 'us', refPrice: 310 }} />);
    expect(ticker().value).toBe('NVDA');
    expect((screen.getByLabelText(/reference price/i) as HTMLInputElement).value).toBe('310');
    expect(submit().disabled).toBe(false);
    // waitFor resolves a "not called" assertion on the first tick, which is
    // before the 120ms debounce — wait past it, or this proves nothing.
    searchSymbols.mockResolvedValueOnce([
      { symbol: 'NVDA', name: 'NVIDIA', exchange: 'NMS', market: 'us', type: 'equity' },
    ]);
    await new Promise((r) => setTimeout(r, 250));
    expect(searchSymbols).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('searches once the reader actually types', async () => {
    render(<TickerForm busy={false} onSubmit={vi.fn()} />);
    fireEvent.change(ticker(), { target: { value: 'NV' } });
    await waitFor(() => expect(searchSymbols).toHaveBeenCalled());
  });

  it('says NEPSE is daily and experimental when that market is chosen', () => {
    render(<TickerForm busy={false} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getAllByRole('combobox')[1]!, { target: { value: 'nepse' } });
    expect(screen.getByText(/unofficial daily data/i)).toBeTruthy();
  });

  it('locks the control while a read is running', () => {
    render(<TickerForm busy onSubmit={vi.fn()} initial={{ symbol: 'AAPL', market: 'us' }} />);
    expect(submit().disabled).toBe(true);
    expect(submit().textContent).toMatch(/reading/i);
  });
});
