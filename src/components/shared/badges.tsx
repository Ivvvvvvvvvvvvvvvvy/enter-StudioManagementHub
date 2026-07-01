import { Badge } from '@/components/ui/badge';
import type { BookingStatus, OrderStatus, CardType, OrderType } from '@/lib/types';

// ── Course type color helpers ─────────────────────────────
const PRESET_PALE: Record<string, string> = {
  yoga:        'bg-yoga-pale text-yoga border-0 hover:bg-yoga-pale font-medium',
  pilates:     'bg-pilates-pale text-pilates border-0 hover:bg-pilates-pale font-medium',
  meditation:  'bg-meditation-pale text-meditation border-0 hover:bg-meditation-pale font-medium',
  barre:       'bg-barre-pale text-barre border-0 hover:bg-barre-pale font-medium',
  hiit:        'bg-hiit-pale text-hiit border-0 hover:bg-hiit-pale font-medium',
  dance:       'bg-dance-pale text-dance border-0 hover:bg-dance-pale font-medium',
  boxing:      'bg-boxing-pale text-boxing border-0 hover:bg-boxing-pale font-medium',
  stretching:  'bg-stretching-pale text-stretching border-0 hover:bg-stretching-pale font-medium',
  spin:        'bg-spin-pale text-spin border-0 hover:bg-spin-pale font-medium',
};

const PRESET_SOLID: Record<string, string> = {
  yoga:        'bg-yoga text-white',
  pilates:     'bg-pilates text-white',
  meditation:  'bg-meditation text-white',
  barre:       'bg-barre text-white',
  hiit:        'bg-hiit text-white',
  dance:       'bg-dance text-white',
  boxing:      'bg-boxing text-white',
  stretching:  'bg-stretching text-white',
  spin:        'bg-spin text-white',
};

// Pale/badge class (for calendar slots, type chips)
export function getCourseTypePaleClass(type: string): string {
  return PRESET_PALE[type.toLowerCase()] ?? 'bg-primary/10 text-primary border-0 hover:bg-primary/10 font-medium';
}

// Solid class (for color bars, accents)
export function getCourseTypeSolidClass(type: string): string {
  return PRESET_SOLID[type.toLowerCase()] ?? 'bg-primary text-primary-foreground';
}

export function CourseTypeBadge({ type }: { type: string }) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return <Badge className={getCourseTypePaleClass(type)}>{label}</Badge>;
}

// ── Booking status badge ──────────────────────────────────
const BOOKING_STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-accent/10 text-accent border-0 hover:bg-accent/10 font-medium' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-0 hover:bg-destructive/10 font-medium' },
  attended:  { label: 'Attended',  className: 'bg-muted text-muted-foreground border-0 hover:bg-muted font-medium' },
  absent:    { label: 'Absent',    className: 'bg-orange-100 text-orange-600 border-0 hover:bg-orange-100 font-medium' },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const cfg = BOOKING_STATUS_CONFIG[status];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

// ── Order status badge ────────────────────────────────────
const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  paid:     { label: 'Paid',     className: 'bg-accent/10 text-accent border-0 hover:bg-accent/10 font-medium' },
  pending:  { label: 'Pending',  className: 'bg-amber-100 text-amber-700 border-0 hover:bg-amber-100 font-medium' },
  refunded: { label: 'Refunded', className: 'bg-muted text-muted-foreground border-0 hover:bg-muted font-medium' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = ORDER_STATUS_CONFIG[status];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

// ── Card type badge ───────────────────────────────────────
const CARD_TYPE_CONFIG: Record<CardType, { label: string; className: string }> = {
  monthly:  { label: 'Monthly Pass',  className: 'bg-primary/10 text-primary border-0 hover:bg-primary/10 font-medium' },
  sessions: { label: 'Session Pack',  className: 'bg-accent/10 text-accent border-0 hover:bg-accent/10 font-medium' },
  annual:   { label: 'Annual Pass',   className: 'bg-muted text-foreground border border-border hover:bg-muted font-medium' },
};

export function CardTypeBadge({ type }: { type: CardType }) {
  const cfg = CARD_TYPE_CONFIG[type];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

// ── Order type label ──────────────────────────────────────
const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  membership: 'Membership',
  single_class: 'Drop-in',
  private_lesson: 'Private Session',
};

export function getOrderTypeLabel(type: OrderType): string {
  return ORDER_TYPE_LABELS[type];
}

// ── Date/time utilities ───────────────────────────────────
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

export function isUpcoming(dateStr: string): boolean {
  return new Date(dateStr) > new Date();
}

export function canCancel(dateStr: string, cancelHours = '24'): boolean {
  const hours = parseInt(cancelHours, 10);
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > hours * 60 * 60 * 1000;
}
