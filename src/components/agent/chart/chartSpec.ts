/**
 * Compact chart spec emitted by the agent inside a ```chart fenced block.
 *
 * The agent only describes WHAT to plot (title + data points); the frontend
 * computes every coordinate and draws a consistent, on-brand SVG. This keeps the
 * agent's output tiny (fast to stream, impossible to misplace) while guaranteeing
 * no overlaps and a unified look.
 */

export type ChartDatum = {
  label: string;
  value: number;
  /** Optional small caption under the label (e.g. "年卡大单"). */
  note?: string;
};

export type ChartSeries = {
  name: string;
  data: number[];
  /** Optional explicit colour; otherwise palette is used. */
  color?: string;
};

export type ChartSpec =
  | {
      type: 'bar';
      title?: string;
      unit?: string;
      data: ChartDatum[];
    }
  | {
      type: 'group-bar';
      title?: string;
      unit?: string;
      categories: string[];
      series: ChartSeries[];
    }
  | {
      type: 'line';
      title?: string;
      unit?: string;
      categories: string[];
      series: ChartSeries[];
    }
  | {
      type: 'pie' | 'donut';
      title?: string;
      unit?: string;
      data: ChartDatum[];
    }
  | {
      type: 'stack-bar';
      title?: string;
      unit?: string;
      data: ChartDatum[];
    }
  | {
      type: 'kpi';
      title?: string;
      items: { label: string; value: string; sub?: string; trend?: 'up' | 'down' | 'flat' }[];
    };

/** All chart `type` values we know how to render. */
export const CHART_TYPES = new Set([
  'bar', 'group-bar', 'line', 'pie', 'donut', 'stack-bar', 'kpi',
]);

export function parseChartSpec(raw: string): ChartSpec | null {
  const trimmed = raw.trim();
  // Cheap pre-check so we never JSON.parse arbitrary code blocks.
  if (!trimmed.startsWith('{') || !trimmed.includes('"type"')) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (!obj || typeof obj !== 'object' || typeof obj.type !== 'string') return null;
    if (!CHART_TYPES.has(obj.type)) return null;
    return obj as ChartSpec;
  } catch {
    return null;
  }
}
