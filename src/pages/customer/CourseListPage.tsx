import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { formatTime, getCourseTypePaleClass } from '@/components/shared/badges';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Helpers ────────────────────────────────────────────────

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am – 9pm
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatHour(h: number) {
  if (h === 12) return '12pm';
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Main component ─────────────────────────────────────────

export default function CourseListPage() {
  const { state, getCourse, getUser, getBookingCount } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialType = searchParams.get('type') ?? 'all';
  const [activeType, setActiveType] = useState<string>(initialType);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });

  const weekLabel = `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const getSlotSessions = useCallback((dayIdx: number, hour: number) => {
    const day = weekDays[dayIdx];
    return state.sessions.filter(s => {
      const d = new Date(s.datetime);
      const course = getCourse(s.courseId);
      if (!course) return false;
      if (activeType !== 'all' && course.type !== activeType) return false;
      return (
        (s.status === 'scheduled' || s.status === 'completed') &&
        d.toDateString() === day.toDateString() &&
        d.getHours() === hour
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessions, weekStart, activeType]);

  // Find the first hour that has any session this week (for display hint)
  const hasAnySession = HOURS.some(h => weekDays.some((_, di) => getSlotSessions(di, h).length > 0));

  const typeFilters = [
    { label: 'All', value: 'all' },
    ...Array.from(new Set(state.courses.map(c => c.type))).map(t => ({
      label: t.charAt(0).toUpperCase() + t.slice(1),
      value: t,
    })),
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* Top bar */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-1">
          <h1 className="font-serif text-lg font-semibold text-foreground mr-2">Classes</h1>
          <button type="button" onClick={prevWeek} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground px-2 min-w-[200px] text-center">{weekLabel}</span>
          <button type="button" onClick={nextWeek} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Type filters */}
        <div className="flex gap-1.5 ml-auto">
          {typeFilters.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setActiveType(f.value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                activeType === f.value
                  ? f.value === 'all'
                    ? 'bg-foreground text-background border-foreground'
                    : `bg-${f.value} text-white border-${f.value}`
                  : 'bg-card text-muted-foreground border-border hover:border-primary/30'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Week grid */}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: 680 }}>

          {/* Day headers */}
          <div className="sticky top-0 z-20 grid bg-card border-b border-border"
            style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
            <div className="border-r border-border" />
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isPast = day < new Date() && !isToday;
              return (
                <div key={i} className={cn('py-2.5 text-center border-r border-border/50', i === 6 && 'border-r-0', isPast && 'opacity-40')}>
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
          {HOURS.map(hour => (
            <div key={hour} className="grid border-b border-border/30"
              style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div className="pr-2 pt-1.5 text-right border-r border-border/50">
                <span className="text-[10px] text-muted-foreground/70">{formatHour(hour)}</span>
              </div>

              {weekDays.map((day, dayIdx) => {
                const sessions = getSlotSessions(dayIdx, hour);
                const isPast = day < new Date() && day.toDateString() !== new Date().toDateString();

                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'min-h-[44px] p-0.5 border-r border-border/25',
                      dayIdx === 6 && 'border-r-0',
                      isPast && 'opacity-40'
                    )}
                  >
                    {sessions.map(s => {
                      const course = getCourse(s.courseId);
                      if (!course) return null;
                      const coach = getUser(s.coachId);
                      const booked = getBookingCount(s.id);
                      const remaining = course.capacity - booked;
                      const isFull = remaining <= 0;

                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={isFull && !isPast}
                          onClick={() => navigate(`/courses/${course.id}`)}
                          className={cn(
                            'w-full text-left px-1.5 py-1 rounded text-xs font-medium mb-0.5 border',
                            'transition-all select-none',
                            isPast
                              ? [getCourseTypePaleClass(course.type), 'opacity-40 cursor-pointer']
                              : isFull
                              ? 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60'
                              : [
                                getCourseTypePaleClass(course.type),
                                'hover:border-current hover:shadow-sm cursor-pointer'
                              ]
                          )}
                        >
                          <div className="truncate leading-tight font-semibold">{course.name}</div>
                          <div className="opacity-60 text-[10px] flex items-center gap-1">
                            {formatTime(s.datetime)}
                            {coach && <span>· {coach.name.split(' ')[0]}</span>}
                            <span className={cn('ml-auto', remaining <= 3 && !isFull && 'text-orange-500 font-medium')}>
                              {isFull ? 'Full' : `${remaining} left`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {!hasAnySession && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Users className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">No classes this week</p>
          </div>
        )}
      </div>
    </div>
  );
}
