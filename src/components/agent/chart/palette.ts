/**
 * Brand-aligned chart palette. Greens lead (studio primary #1D9E6A), with a few
 * supporting hues for multi-series / categorical charts. Kept as literals because
 * these are painted inside SVG where CSS tokens are not available.
 */
export const CHART_PALETTE = [
  '#1D9E6A', // primary green
  '#34C77B', // light green
  '#7BD8A6', // mint
  '#F2B33D', // amber
  '#E8804D', // coral
  '#5B8DEF', // blue
  '#9B6DE3', // violet
  '#9AA4B2', // neutral grey (e.g. one-off outliers)
];

export const CHART_INK = '#1F2937'; // strong text
export const CHART_MUTED = '#6B7280'; // secondary text
export const CHART_GRID = '#E5E7EB'; // gridlines / axes
export const CHART_UP = '#1D9E6A';
export const CHART_DOWN = '#E74C3C';

export function colorAt(i: number): string {
  return CHART_PALETTE[i % CHART_PALETTE.length];
}

/** Compact currency/number formatting for axis ticks (e.g. 9800 -> "9.8K"). */
export function shortNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}亿`;
  if (abs >= 1_0000) return `${(n / 1_0000).toFixed(abs >= 10_0000 ? 0 : 1)}万`;
  if (abs >= 1000) return `${(n / 1000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return `${n}`;
}

/** Full number with thousands separators (e.g. 9800 -> "9,800"). */
export function fullNum(n: number): string {
  return n.toLocaleString('en-US');
}

/** "Nice" rounded axis maximum so gridlines land on clean values. */
export function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const norm = max / pow;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * pow;
}
