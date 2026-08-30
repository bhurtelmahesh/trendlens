/**
 * R-squared of an ordinary least-squares line through `values` (indexed 0..n-1).
 * 1 = a perfectly straight trend, 0 = no linear relationship.
 */
export function rSquared(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    const dy = values[i]! - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return 0;
  return (sxy * sxy) / (sxx * syy);
}
