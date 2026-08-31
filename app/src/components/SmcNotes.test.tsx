// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Candle } from '../../../shared/types';
import { SmcNotes } from './SmcNotes';

const bar = (o: number, h: number, l: number, c: number, i: number): Candle => ({
  time: Date.UTC(2026, 0, 1) + i * 3_600_000, open: o, high: h, low: l, close: c, volume: 1000,
});
/** A calm series with a sweep of the swing low at the end. */
function withSweep(): Candle[] {
  const rows: Candle[] = [];
  for (let i = 0; i < 30; i++) { const p = 100 + Math.sin(i / 3) * 4; rows.push(bar(p, p + 1, p - 1, p, i)); }
  const low = Math.min(...rows.map((r) => r.low));
  rows.push(bar(low + 1, low + 1.5, low - 4, low + 1.2, 30));
  return rows;
}

afterEach(cleanup);
const GUIDE = '/guide.html';

describe('SmcNotes', () => {
  it('renders nothing when the bars show none of the patterns', () => {
    const { container } = render(<SmcNotes candles={[]} guideHref={GUIDE} />);
    expect(container.firstChild).toBeNull();
  });

  it('links each finding to the plate that explains it', () => {
    render(<SmcNotes candles={withSweep()} guideHref={GUIDE} />);
    const links = screen.getAllByRole('link').filter((a) => /#c\d+$/.test(a.getAttribute('href') ?? ''));
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) expect(a.getAttribute('href')).toMatch(/^\/guide\.html#c(1|2|6|7|9|15)$/);
  });

  it('names the sweep it found and where it happened', () => {
    render(<SmcNotes candles={withSweep()} guideHref={GUIDE} />);
    expect(screen.getByRole('link', { name: 'SWEEP' }).getAttribute('href')).toBe('/guide.html#c7');
    expect(screen.getByText(/closed back above it/i)).toBeTruthy();
  });

  it('says plainly that it is not a forecast', () => {
    render(<SmcNotes candles={withSweep()} guideHref={GUIDE} />);
    expect(screen.getByText(/not a forecast/i)).toBeTruthy();
  });

  it('never claims what price will do next', () => {
    const { container } = render(<SmcNotes candles={withSweep()} guideHref={GUIDE} />);
    expect(container.textContent).not.toMatch(/\bwill\b|\bshould\b|likely|going to|predict/i);
  });

  it('respects the base path the app is served under', () => {
    render(<SmcNotes candles={withSweep()} guideHref="/trendlens/guide.html" />);
    for (const a of screen.getAllByRole('link')) {
      expect(a.getAttribute('href')).toMatch(/^\/trendlens\/guide\.html/);
    }
  });
});
