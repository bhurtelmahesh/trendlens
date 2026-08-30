/** Exponential moving average of `values`. Returns an array the same length. */
export function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]!];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i]! * k + out[i - 1]! * (1 - k));
  }
  return out;
}

/** A period that adapts to how much history we have (5..20). */
export function emaPeriodFor(count: number): number {
  return Math.max(5, Math.min(20, Math.floor(count / 3)));
}

/**
 * Percent change in the EMA per bar, measured over the last `lookback` bars
 * (default = the EMA period). Positive = rising.
 */
export function emaSlopePctPerBar(series: number[], lookback: number): number {
  const n = series.length;
  if (n < 2) return 0;
  const look = Math.min(lookback, n - 1);
  const now = series[n - 1]!;
  const past = series[n - 1 - look]!;
  if (past === 0) return 0;
  return ((now - past) / past / look) * 100;
}
