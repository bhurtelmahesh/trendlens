import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchSymbols } from './search';

const quotes = (rows: unknown[]) => vi.fn(async () => new Response(JSON.stringify({ quotes: rows }), { status: 200 }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('symbol search', () => {
  it('does not call out for a query too short to be useful', async () => {
    const f = quotes([]);
    vi.stubGlobal('fetch', f);
    expect(await searchSymbols('a')).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it('buckets results by what the symbol and exchange say', async () => {
    vi.stubGlobal('fetch', quotes([
      { symbol: 'AAPL', shortname: 'Apple', exchDisp: 'NASDAQ', quoteType: 'EQUITY' },
      { symbol: 'BTC-USD', shortname: 'Bitcoin', exchDisp: 'CCC', quoteType: 'CRYPTOCURRENCY' },
      { symbol: '7203.T', shortname: 'Toyota', exchDisp: 'Tokyo', quoteType: 'EQUITY' },
    ]));
    const r = await searchSymbols('test');
    expect(r.map((x) => `${x.symbol}:${x.market}`)).toEqual(['AAPL:us', 'BTC-USD:crypto', '7203.T:global']);
  });

  it('drops rows with no symbol or an unusable type', async () => {
    vi.stubGlobal('fetch', quotes([
      { shortname: 'No symbol', quoteType: 'EQUITY' },
      { symbol: 'FUT', quoteType: 'FUTURE' },
      { symbol: 'OK', shortname: 'Fine', quoteType: 'EQUITY' },
    ]));
    expect((await searchSymbols('test')).map((x) => x.symbol)).toEqual(['OK']);
  });

  it('caps the list so the dropdown stays usable', async () => {
    vi.stubGlobal('fetch', quotes(Array.from({ length: 20 }, (_, i) => ({ symbol: `S${i}`, quoteType: 'EQUITY' }))));
    expect(await searchSymbols('test')).toHaveLength(8);
  });

  it('returns nothing rather than throwing when the upstream fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    await expect(searchSymbols('test')).resolves.toEqual([]);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(searchSymbols('test')).resolves.toEqual([]);
  });

  it('falls back to the symbol when a row has no name', async () => {
    vi.stubGlobal('fetch', quotes([{ symbol: 'BARE', quoteType: 'EQUITY' }]));
    expect((await searchSymbols('test'))[0]!.name).toBe('BARE');
  });
});
