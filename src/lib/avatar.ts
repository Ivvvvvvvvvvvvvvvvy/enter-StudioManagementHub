// Deterministic avatar color assignment based on user ID
// Each user consistently gets a unique color from a broad palette.
import type { CSSProperties } from 'react';

const PALETTE = [
  { bg: '#ef4444', label: 'red' },
  { bg: '#f97316', label: 'orange' },
  { bg: '#f59e0b', label: 'amber' },
  { bg: '#10b981', label: 'emerald' },
  { bg: '#14b8a6', label: 'teal' },
  { bg: '#06b6d4', label: 'cyan' },
  { bg: '#3b82f6', label: 'blue' },
  { bg: '#6366f1', label: 'indigo' },
  { bg: '#8b5cf6', label: 'violet' },
  { bg: '#d946ef', label: 'fuchsia' },
  { bg: '#ec4899', label: 'pink' },
  { bg: '#84cc16', label: 'lime' },
  { bg: '#0ea5e9', label: 'sky' },
  { bg: '#22c55e', label: 'green' },
  { bg: '#a855f7', label: 'purple' },
  { bg: '#f43f5e', label: 'rose' },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Returns an inline style object { background, color } for avatar backgrounds */
export function avatarStyle(id: string): CSSProperties {
  const entry = PALETTE[hashStr(id) % PALETTE.length];
  return { background: entry.bg, color: '#fff' };
}

/** Returns just the hex background color */
export function avatarBg(id: string): string {
  return PALETTE[hashStr(id) % PALETTE.length].bg;
}
