import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatTime, getCourseTypePaleClass, getCourseTypeSolidClass } from '@/components/shared/badges';
import { ChevronLeft, ChevronRight, Users, X, Clock, MapPin, CalendarDays, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { avatarStyle } from '@/lib/avatar';

// ── Helpers ────────────────────────────────────────────────

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
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

// ── Today's Classes panel ──────────────────────────────────

function TodayPanel({ coachId }: { coachId: string }) {
  const { getCoachSessions, getCourse, getSessionBookings, getUser, getBookingCount } = useStore();
  const navigate = useNavigate();

  const today = new Date();
  const todaySessions = getCoachSessions(coachId)
    .filter(s => new Date(s.datetime).toDateString() === today.toDateString())
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  if (todaySessions.length === 0) {
    return (
      <div className="shrink-0 px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Today — {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">No classes scheduled for today. Enjoy your rest day!</p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-border bg-card">
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Today — {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h2>
        <span className="ml-auto text-xs text-muted-foreground">{todaySessions.length} class{todaySessions.length > 1 ? 'es' : ''}</span>
      </div>

      <div className="flex gap-3 px-5 pb-4 overflow-x-auto scrollbar-thin">
        {todaySessions.map(session => {
          const course = getCourse(session.courseId);
          if (!course) return null;
          const bookings = getSessionBookings(session.id);
          const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'attended');
          const booked = getBookingCount(session.id);
          const isPast = new Date(session.datetime) < today;
          const isNow = !isPast && new Date(session.datetime).getTime() - today.getTime() < 90 * 60 * 1000;

          return (
            <div key={session.id}
              className={cn(
                'shrink-0 w-56 rounded-xl border bg-background overflow-hidden',
                isNow ? 'border-primary/50 shadow-sm' : 'border-border',
                isPast ? 'opacity-60' : ''
              )}>
              <div className={cn('h-1.5 w-full', getCourseTypeSolidClass(course.type))} />
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-semibold text-sm text-foreground leading-tight">{course.name}</div>
                  {isNow && (
                    <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold shrink-0">Now</span>
                  )}
                  {isPast && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>
                <div className="space-y-0.5 mb-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 shrink-0" />
                    {formatTime(session.datetime)} · {course.duration} min
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {session.room}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3 h-3 shrink-0" />
                    {booked} / {course.capacity} enrolled
                  </div>
                </div>

                {/* Student avatar strip */}
                {confirmed.length > 0 && (
                  <div className="flex items-center gap-1 mb-2.5">
                    {confirmed.slice(0, 5).map(b => {
                      const u = getUser(b.customerId);
                      return (
                        <div key={b.id}
                          className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center border border-background overflow-hidden shrink-0"
                          style={u?.avatar ? undefined : avatarStyle(b.customerId)}
                          title={u?.name}>
                          {u?.avatar
                            ? <img src={u.avatar} alt={u.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                            : u?.name?.[0] ?? '?'}
                        </div>
                      );
                    })}
                    {confirmed.length > 5 && (
                      <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center border border-background">
                        +{confirmed.length - 5}
                      </div>
                    )}
                  </div>
                )}

                <Button size="sm" variant="outline"
                  className="h-7 text-xs w-full"
                  onClick={() => navigate(`/coach/class/${session.id}`)}>
                  View Students →
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────

export default function CoachSchedulePage() {
  const { getCourse, getCoachSessions, getBookingCount } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const coachId = user?.userId ?? 'coach-1';

  const allSessions = getCoachSessions(coachId);
  const upcoming = allSessions.filter(s => s.status === 'scheduled' && new Date(s.datetime) > new Date());
  const completed = allSessions.filter(s => s.status === 'completed');

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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
    return allSessions.filter(s => {
      const d = new Date(s.datetime);
      return d.toDateString() === day.toDateString() && d.getHours() === hour;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSessions, weekStart]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background" onClick={() => setActiveSessionId(null)}>

      {/* Today's classes panel */}
      <TodayPanel coachId={coachId} />

      {/* Week nav bar */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-5 py-2.5 border-b border-border bg-card">
        <div className="flex items-center gap-1">
          <h1 className="font-semibold text-sm text-foreground mr-2">Weekly Schedule</h1>
          <button type="button" onClick={prevWeek} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground px-2 min-w-[200px] text-center">{weekLabel}</span>
          <button type="button" onClick={nextWeek} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2 ml-auto">
          {[
            { label: 'Total', value: allSessions.length },
            { label: 'Upcoming', value: upcoming.length },
            { label: 'Done', value: completed.length },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs">
              <span className="font-semibold text-foreground">{s.value}</span>
              <span className="text-muted-foreground">{s.label}</span>
            </div>
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
          {HOURS.map(hour => (
            <div key={hour} className="grid border-b border-border/30"
              style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div className="pr-2 pt-1.5 text-right border-r border-border/50">
                <span className="text-[10px] text-muted-foreground/70">{formatHour(hour)}</span>
              </div>

              {weekDays.map((_, dayIdx) => {
                const sessions = getSlotSessions(dayIdx, hour);

                return (
                  <div
                    key={dayIdx}
                    className={cn('min-h-[44px] p-0.5 border-r border-border/25', dayIdx === 6 && 'border-r-0')}
                  >
                    {sessions.map(s => {
                      const course = getCourse(s.courseId);
                      if (!course) return null;
                      const booked = getBookingCount(s.id);
                      const isActive = activeSessionId === s.id;
                      const isPast = new Date(s.datetime) < new Date();
                      const popoverSide = dayIdx >= 4 ? 'right-full mr-1' : 'left-full ml-1';

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={e => { e.stopPropagation(); setActiveSessionId(isActive ? null : s.id); }}
                          className={cn(
                            'relative w-full text-left px-1.5 py-1 rounded text-xs font-medium mb-0.5 border',
                            'transition-all select-none',
                            isPast ? 'opacity-50' : '',
                            getCourseTypePaleClass(course.type),
                            isActive && 'ring-1 ring-current ring-offset-1'
                          )}
                        >
                          <div className="truncate leading-tight">{course.name}</div>
                          <div className="opacity-55 text-[10px] flex items-center gap-1">
                            {formatTime(s.datetime)}
                            <span className="ml-auto flex items-center gap-0.5">
                              <Users className="w-2.5 h-2.5" />{booked}/{course.capacity}
                            </span>
                          </div>

                          {/* Detail popover */}
                          {isActive && (
                            <div
                              className={cn('absolute top-0 z-30 w-48 bg-card border border-border rounded-lg shadow-card-hover p-3 text-foreground', popoverSide)}
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="font-semibold text-xs leading-snug">{course.name}</div>
                                <button type="button" onClick={() => setActiveSessionId(null)}
                                  className="text-muted-foreground hover:text-foreground shrink-0 ml-1">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                                <div>{formatTime(s.datetime)} · {course.duration} min</div>
                                <div>{s.room}</div>
                                <div className={cn(booked >= course.capacity ? 'text-destructive' : '')}>
                                  {booked} / {course.capacity} booked
                                </div>
                              </div>
                              <button
                                type="button"
                                className="text-xs text-primary hover:opacity-70 transition-opacity font-medium"
                                onClick={() => navigate(`/coach/class/${s.id}`)}
                              >
                                View students →
                              </button>
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
