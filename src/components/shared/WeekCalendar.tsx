import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Shared types ───────────────────────────────────────────

export interface WeekSlotItem {
  id: string;
  datetime: string; // ISO
  label: string;
  sublabel?: string;
  colorClass: string; // e.g. "bg-yoga-pale text-yoga border-yoga/25"
  dimmed?: boolean;
  disabled?: boolean;
}

interface WeekCalendarProps {
  title?: string;
  items: WeekSlotItem[];
  toolbar?: React.ReactNode;
  /** Called when an item block is clicked */
  renderPopover?: (item: WeekSlotItem, onClose: () => void) => React.ReactNode;
  className?: string;
  /** Initial week to display. Defaults to the current week. */
  initialWeek?: Date;
}

// ── Helpers ────────────────────────────────────────────────

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function formatHour(h: number) {
  if (h === 12) return '12pm';
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Component ──────────────────────────────────────────────

export function WeekCalendar({ title, items, toolbar, renderPopover, className, initialWeek }: WeekCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(initialWeek ?? new Date()));
  const [activeId, setActiveId] = useState<string | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });

  const weekLabel = `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const getSlotItems = useCallback((dayIdx: number, hour: number) => {
    const day = weekDays[dayIdx];
    return items.filter(item => {
      const d = new Date(item.datetime);
      return d.toDateString() === day.toDateString() && d.getHours() === hour;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, weekStart]);

  // Only render hours that have items ± 1
  const activeHours = HOURS.filter(h => weekDays.some((_, di) => getSlotItems(di, h).length > 0));
  const minHour = activeHours.length > 0 ? Math.max(7, Math.min(...activeHours) - 1) : 7;
  const maxHour = activeHours.length > 0 ? Math.min(21, Math.max(...activeHours) + 1) : 21;
  const visibleHours = HOURS.filter(h => h >= minHour && h <= maxHour);

  return (
    <div className={cn('flex flex-col h-full overflow-hidden bg-background', className)}
      onClick={() => setActiveId(null)}>

      {/* Top bar */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-1">
          {title && <h1 className="font-serif text-lg font-semibold text-foreground mr-2">{title}</h1>}
          <button type="button" onClick={prevWeek} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground px-2 min-w-[200px] text-center">{weekLabel}</span>
          <button type="button" onClick={nextWeek} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: 560 }}>

          {/* Day headers */}
          <div className="sticky top-0 z-20 grid bg-card border-b border-border"
            style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
            <div className="border-r border-border" />
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={i} className={cn('py-2.5 text-center border-r border-border/50', i === 6 && 'border-r-0')}>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{DAY_LABELS[i]}</div>
                  <div className={cn(
                    'text-sm font-bold mt-0.5 mx-auto w-7 h-7 flex items-center justify-center rounded-full',
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  )}>{day.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Hour rows */}
          {visibleHours.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              Nothing scheduled this week
            </div>
          ) : visibleHours.map(hour => (
            <div key={hour} className="grid border-b border-border/30"
              style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div className="pr-2 pt-1.5 text-right border-r border-border/50">
                <span className="text-[10px] text-muted-foreground/70">{formatHour(hour)}</span>
              </div>

              {weekDays.map((_, dayIdx) => {
                const slotItems = getSlotItems(dayIdx, hour);
                return (
                  <div key={dayIdx} className={cn('min-h-[44px] p-0.5 border-r border-border/25', dayIdx === 6 && 'border-r-0')}>
                    {slotItems.map(item => {
                      const isActive = activeId === item.id;
                      const popoverSide = dayIdx >= 4 ? 'right-full mr-1' : 'left-full ml-1';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={item.disabled}
                          onClick={e => { e.stopPropagation(); setActiveId(isActive ? null : item.id); }}
                          className={cn(
                            'relative w-full text-left px-1.5 py-1 rounded text-xs font-medium mb-0.5 border transition-all select-none',
                            item.colorClass,
                            item.dimmed && 'opacity-50',
                            item.disabled ? 'cursor-default' : 'hover:shadow-sm',
                            isActive && 'ring-1 ring-current ring-offset-1'
                          )}
                        >
                          <div className="truncate leading-tight">{item.label}</div>
                          {item.sublabel && <div className="opacity-55 text-[10px] truncate">{item.sublabel}</div>}

                          {isActive && renderPopover && (
                            <div
                              className={cn('absolute top-0 z-30 w-48 bg-card border border-border rounded-lg shadow-card-hover p-3 text-foreground cursor-default', popoverSide)}
                              onClick={e => e.stopPropagation()}
                            >
                              {renderPopover(item, () => setActiveId(null))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
