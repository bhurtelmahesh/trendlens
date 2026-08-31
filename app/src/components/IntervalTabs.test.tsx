// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { IntervalTabs } from './IntervalTabs';

// Module-level spies keep their call history between tests, so a
// "never called" assertion would pass only in the declared order and
// fail under --sequence.shuffle.
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof IntervalTabs>[0]> = {}) => {
  const onPick = vi.fn();
  render(
    <IntervalTabs current="1d" market="us" pending={null} busy={false} onPick={onPick} {...over} />,
  );
  return onPick;
};
const tab = (label: string) => screen.getByRole('button', { name: label });

describe('IntervalTabs', () => {
  it('offers the five intervals the worker serves', () => {
    setup();
    for (const iv of ['1m', '5m', '1h', '1d', '1wk']) expect(tab(iv)).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('marks the interval actually on screen, and does not re-request it', () => {
    const onPick = setup({ current: '5m' });
    expect(tab('5m').getAttribute('aria-pressed')).toBe('true');
    expect(tab('1d').getAttribute('aria-pressed')).toBe('false');
    // The active tab is disabled: clicking it would refetch what is displayed.
    expect((tab('5m') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(tab('5m'));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('asks for the interval that was clicked', () => {
    const onPick = setup();
    fireEvent.click(tab('1m'));
    expect(onPick).toHaveBeenCalledWith('1m');
  });

  it('locks every interval but daily for NEPSE, and says why', () => {
    const onPick = setup({ market: 'nepse' });
    for (const iv of ['1m', '5m', '1h', '1wk']) {
      const b = tab(iv) as HTMLButtonElement;
      expect(b.disabled, iv).toBe(true);
      expect(b.title, iv).toMatch(/daily only/i);
    }
    fireEvent.click(tab('1m'));
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByText(/NEPSE is daily only/i)).toBeTruthy();
  });

  it('blocks further switching while one is in flight', () => {
    const onPick = setup({ busy: true, pending: '1m' });
    for (const iv of ['1m', '5m', '1h', '1wk']) {
      expect((tab(iv) as HTMLButtonElement).disabled, iv).toBe(true);
    }
    fireEvent.click(tab('5m'));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('says how much history each interval covers', () => {
    setup({ current: '1m' });
    expect(screen.getByText(/about 5 hours of market time/i)).toBeTruthy();
    cleanup();
    setup({ current: '1wk' });
    expect(screen.getByText(/about 6 years/i)).toBeTruthy();
  });

  it('is a labelled group, not a bare row of buttons', () => {
    setup();
    expect(screen.getByRole('group', { name: /chart interval/i })).toBeTruthy();
  });
});
