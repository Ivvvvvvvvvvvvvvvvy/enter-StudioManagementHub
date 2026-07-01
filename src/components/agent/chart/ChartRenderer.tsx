import { useMemo } from 'react';
import type { ChartSpec } from './chartSpec';
import {
  CHART_GRID, CHART_INK, CHART_MUTED, CHART_DOWN, CHART_UP,
  colorAt, shortNum, fullNum, niceMax,
} from './palette';

/**
 * Renders a compact ChartSpec into a clean, on-brand SVG. The agent supplies only
 * data; all geometry is computed here so charts never overlap and always match
 * the studio's visual style. Output is a static <svg> (no scripts) sized by its
 * viewBox, so it scales fluidly with zero height jitter.
 */
export function ChartRenderer({ spec }: { spec: ChartSpec }) {
  const svg = useMemo(() => renderSpec(spec), [spec]);
  if (!svg) return null;
  return (
    <div
      className="block [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

const W = 760;
const FONT = `font-family="-apple-system,'PingFang SC','Microsoft YaHei',sans-serif"`;

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function titleBlock(title: string | undefined, w = W): { svg: string; top: number } {
  if (!title) return { svg: '', top: 16 };
  return {
    svg: `<text x="24" y="30" font-size="16" font-weight="600" fill="${CHART_INK}" ${FONT}>${esc(title)}</text>`,
    top: 52,
  };
}

function renderSpec(spec: ChartSpec): string | null {
  switch (spec.type) {
    case 'bar': return barChart(spec);
    case 'group-bar': return groupBarChart(spec);
    case 'line': return lineChart(spec);
    case 'pie':
    case 'donut': return pieChart(spec);
    case 'stack-bar': return stackBar(spec);
    case 'kpi': return kpiCards(spec);
    default: return null;
  }
}

function wrap(h: number, inner: string): string {
  return `<svg viewBox="0 0 ${W} ${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img">${inner}</svg>`;
}

/* ------------------------------- bar ------------------------------- */
function barChart(spec: Extract<ChartSpec, { type: 'bar' }>): string {
  const { svg: ttl, top } = titleBlock(spec.title);
  const hasNote = spec.data.some((d) => d.note);
  const padL = 56, padR = 24;
  const padB = hasNote ? 56 : 38; // room for x labels (+ optional note row)
  const chartH = 300;
  const h = top + chartH + padB;
  const plotW = W - padL - padR;
  const plotBottom = top + chartH;
  const max = niceMax(Math.max(1, ...spec.data.map((d) => d.value)));
  const n = spec.data.length;
  const slot = plotW / n;
  const bw = Math.min(56, slot * 0.6);

  let g = '';
  // gridlines + y ticks
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i;
    const y = plotBottom - (v / max) * chartH;
    g += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="${CHART_GRID}" stroke-width="1"/>`;
    g += `<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" font-size="11" fill="${CHART_MUTED}" text-anchor="end" ${FONT}>${shortNum(v)}</text>`;
  }
  spec.data.forEach((d, i) => {
    const x = padL + slot * i + (slot - bw) / 2;
    const bh = max > 0 ? (d.value / max) * chartH : 0;
    const y = plotBottom - bh;
    const cx = x + bw / 2;
    g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, bh).toFixed(1)}" rx="4" fill="${colorAt(0)}"/>`;
    if (d.value > 0) g += `<text x="${cx.toFixed(1)}" y="${(y - 8).toFixed(1)}" font-size="11" font-weight="600" fill="${CHART_INK}" text-anchor="middle" ${FONT}>${esc(spec.unit ?? '')}${fullNum(d.value)}</text>`;
    g += `<text x="${cx.toFixed(1)}" y="${(plotBottom + 18).toFixed(1)}" font-size="12" fill="${CHART_MUTED}" text-anchor="middle" ${FONT}>${esc(d.label)}</text>`;
    if (d.note) g += `<text x="${cx.toFixed(1)}" y="${(plotBottom + 34).toFixed(1)}" font-size="10" fill="${CHART_MUTED}" text-anchor="middle" ${FONT}>${esc(d.note)}</text>`;
  });
  return wrap(h, ttl + g);
}

/* ----------------------------- group-bar ---------------------------- */
function groupBarChart(spec: Extract<ChartSpec, { type: 'group-bar' }>): string {
  const { svg: ttl, top } = titleBlock(spec.title);
  const padL = 56, padR = 24, padB = 64;
  const chartH = 300;
  const h = top + chartH + padB - 12;
  const plotW = W - padL - padR;
  const plotBottom = top + chartH;
  const allVals = spec.series.flatMap((s) => s.data);
  const max = niceMax(Math.max(1, ...allVals));
  const n = spec.categories.length;
  const slot = plotW / n;
  const sCount = spec.series.length;
  const groupW = Math.min(slot * 0.7, sCount * 26);
  const bw = groupW / sCount;

  let g = '';
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i;
    const y = plotBottom - (v / max) * chartH;
    g += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="${CHART_GRID}"/>`;
    g += `<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" font-size="11" fill="${CHART_MUTED}" text-anchor="end" ${FONT}>${shortNum(v)}</text>`;
  }
  spec.categories.forEach((cat, ci) => {
    const gx = padL + slot * ci + (slot - groupW) / 2;
    spec.series.forEach((s, si) => {
      const v = s.data[ci] ?? 0;
      const bh = (v / max) * chartH;
      const x = gx + bw * si;
      g += `<rect x="${x.toFixed(1)}" y="${(plotBottom - bh).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${Math.max(0, bh).toFixed(1)}" rx="3" fill="${s.color ?? colorAt(si)}"/>`;
    });
    g += `<text x="${(padL + slot * ci + slot / 2).toFixed(1)}" y="${(plotBottom + 18).toFixed(1)}" font-size="12" fill="${CHART_MUTED}" text-anchor="middle" ${FONT}>${esc(cat)}</text>`;
  });
  // legend
  g += legend(spec.series.map((s, i) => ({ name: s.name, color: s.color ?? colorAt(i) })), top + chartH + 40);
  return wrap(h, ttl + g);
}

/* ------------------------------- line ------------------------------- */
function lineChart(spec: Extract<ChartSpec, { type: 'line' }>): string {
  const { svg: ttl, top } = titleBlock(spec.title);
  const padL = 56, padR = 24, padB = 64;
  const chartH = 300;
  const h = top + chartH + padB - 12;
  const plotW = W - padL - padR;
  const plotBottom = top + chartH;
  const allVals = spec.series.flatMap((s) => s.data);
  const max = niceMax(Math.max(1, ...allVals));
  const n = spec.categories.length;
  const step = n > 1 ? plotW / (n - 1) : 0;

  let g = '';
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i;
    const y = plotBottom - (v / max) * chartH;
    g += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="${CHART_GRID}"/>`;
    g += `<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" font-size="11" fill="${CHART_MUTED}" text-anchor="end" ${FONT}>${shortNum(v)}</text>`;
  }
  spec.categories.forEach((cat, ci) => {
    const x = padL + step * ci;
    g += `<text x="${x.toFixed(1)}" y="${(plotBottom + 18).toFixed(1)}" font-size="12" fill="${CHART_MUTED}" text-anchor="middle" ${FONT}>${esc(cat)}</text>`;
  });
  spec.series.forEach((s, si) => {
    const col = s.color ?? colorAt(si);
    const pts = s.data.map((v, i) => [padL + step * i, plotBottom - (v / max) * chartH] as const);
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    g += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p) => { g += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="#fff" stroke="${col}" stroke-width="2"/>`; });
  });
  g += legend(spec.series.map((s, i) => ({ name: s.name, color: s.color ?? colorAt(i) })), top + chartH + 40);
  return wrap(h, ttl + g);
}

/* ------------------------------- pie -------------------------------- */
function pieChart(spec: Extract<ChartSpec, { type: 'pie' | 'donut' }>): string {
  const { svg: ttl, top } = titleBlock(spec.title);
  const total = spec.data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 200, r = 110;
  const cy = top + r + 12;
  const h = cy + r + 28;
  const inner = spec.type === 'donut' ? r * 0.58 : 0;

  let g = '';
  let angle = -Math.PI / 2;
  spec.data.forEach((d, i) => {
    const frac = d.value / total;
    const a2 = angle + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    if (frac > 0) {
      if (inner > 0) {
        const ix1 = cx + inner * Math.cos(a2), iy1 = cy + inner * Math.sin(a2);
        const ix2 = cx + inner * Math.cos(angle), iy2 = cy + inner * Math.sin(angle);
        g += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix1.toFixed(1)},${iy1.toFixed(1)} A${inner},${inner} 0 ${large} 0 ${ix2.toFixed(1)},${iy2.toFixed(1)} Z" fill="${colorAt(i)}"/>`;
      } else {
        g += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${colorAt(i)}"/>`;
      }
    }
    angle = a2;
  });
  // legend on the right
  const lx = 380;
  let ly = top + 8;
  spec.data.forEach((d, i) => {
    const pct = ((d.value / total) * 100).toFixed(1);
    g += `<rect x="${lx}" y="${ly}" width="12" height="12" rx="3" fill="${colorAt(i)}"/>`;
    g += `<text x="${lx + 20}" y="${ly + 11}" font-size="13" fill="${CHART_INK}" ${FONT}>${esc(d.label)}</text>`;
    g += `<text x="${W - 24}" y="${ly + 11}" font-size="13" font-weight="600" fill="${CHART_MUTED}" text-anchor="end" ${FONT}>${esc(spec.unit ?? '')}${fullNum(d.value)} · ${pct}%</text>`;
    ly += 30;
  });
  return wrap(Math.max(h, ly + 12), ttl + g);
}

/* ----------------------------- stack-bar ---------------------------- */
function stackBar(spec: Extract<ChartSpec, { type: 'stack-bar' }>): string {
  const { svg: ttl, top } = titleBlock(spec.title);
  const total = spec.data.reduce((s, d) => s + d.value, 0) || 1;
  const padL = 24, padR = 24;
  const barW = W - padL - padR;
  const barH = 56;
  const y = top + 8;
  const h = y + barH + 64;

  let g = '';
  let x = padL;
  spec.data.forEach((d, i) => {
    const w = (d.value / total) * barW;
    const pct = ((d.value / total) * 100).toFixed(1);
    const col = colorAt(i);
    const rxL = i === 0 ? 8 : 0;
    g += `<rect x="${x.toFixed(1)}" y="${y}" width="${Math.max(0, w).toFixed(1)}" height="${barH}" fill="${col}" rx="${rxL}"/>`;
    if (w > 48) {
      g += `<text x="${(x + w / 2).toFixed(1)}" y="${y + 25}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle" ${FONT}>${esc(spec.unit ?? '')}${fullNum(d.value)}</text>`;
      g += `<text x="${(x + w / 2).toFixed(1)}" y="${y + 43}" font-size="11" fill="#fff" fill-opacity="0.9" text-anchor="middle" ${FONT}>${pct}%</text>`;
    }
    // label below
    g += `<text x="${(x + w / 2).toFixed(1)}" y="${y + barH + 24}" font-size="12" font-weight="600" fill="${col}" text-anchor="middle" ${FONT}>${esc(d.label)}</text>`;
    if (d.note) g += `<text x="${(x + w / 2).toFixed(1)}" y="${y + barH + 40}" font-size="10" fill="${CHART_MUTED}" text-anchor="middle" ${FONT}>${esc(d.note)}</text>`;
    x += w;
  });
  return wrap(h, ttl + g);
}

/* ------------------------------- kpi -------------------------------- */
function kpiCards(spec: Extract<ChartSpec, { type: 'kpi' }>): string {
  const { svg: ttl, top } = titleBlock(spec.title);
  const items = spec.items;
  const gap = 12, padX = 24;
  const cols = Math.min(items.length, 4);
  const rows = Math.ceil(items.length / cols);
  const cardW = (W - padX * 2 - gap * (cols - 1)) / cols;
  const cardH = 92;
  const h = top + rows * cardH + (rows - 1) * gap + 16;

  let g = '';
  items.forEach((it, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = padX + c * (cardW + gap);
    const y = top + r * (cardH + gap);
    const trendCol = it.trend === 'down' ? CHART_DOWN : it.trend === 'up' ? CHART_UP : CHART_MUTED;
    g += `<rect x="${x.toFixed(1)}" y="${y}" width="${cardW.toFixed(1)}" height="${cardH}" rx="12" fill="#fff" stroke="${CHART_GRID}"/>`;
    g += `<text x="${(x + 16).toFixed(1)}" y="${y + 26}" font-size="12" fill="${CHART_MUTED}" ${FONT}>${esc(it.label)}</text>`;
    g += `<text x="${(x + 16).toFixed(1)}" y="${y + 56}" font-size="24" font-weight="700" fill="${CHART_INK}" ${FONT}>${esc(it.value)}</text>`;
    if (it.sub) g += `<text x="${(x + 16).toFixed(1)}" y="${y + 78}" font-size="11" fill="${trendCol}" ${FONT}>${esc(it.sub)}</text>`;
  });
  return wrap(h, ttl + g);
}

/* ------------------------------ legend ------------------------------ */
function legend(items: { name: string; color: string }[], y: number): string {
  let g = '';
  let x = 56;
  items.forEach((it) => {
    g += `<rect x="${x}" y="${y - 10}" width="12" height="12" rx="3" fill="${it.color}"/>`;
    g += `<text x="${x + 18}" y="${y}" font-size="12" fill="${CHART_MUTED}" ${FONT}>${esc(it.name)}</text>`;
    x += 26 + it.name.length * 13 + 16;
  });
  return g;
}
