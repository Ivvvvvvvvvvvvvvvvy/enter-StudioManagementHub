import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { formatTime } from '@/components/shared/badges';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ClassSession } from '@/lib/types';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am – 9pm
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatHour(h: number) {
  if (h === 12) return '12pm';
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function AdminCalendarPage() {
  const { state, getCourse, getUser, dispatch } = useStore();
  const { toast } = useToast();

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [hoverSlot, setHoverSlot] = useState<{ d: number; h: number } | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const dragCourse = useRef<string | null>(null);
  const dragSession = useRef<string | null>(null);

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
      return d.toDateString() === day.toDateString() && d.getHours() === hour && s.status !== 'cancelled';
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessions, weekStart]);

  const handleDrop = (dayIdx: number, hour: number, e: React.DragEvent) => {
    e.preventDefault();
    setHoverSlot(null);
    const target = new Date(weekDays[dayIdx]);
    target.setHours(hour, 0, 0, 0);

    if (dragCourse.current) {
      const course = state.courses.find(c => c.id === dragCourse.current);
      if (!course) return;
      const newSession: ClassSession = {
        id: `session-${Date.now()}`,
        courseId: course.id,
        coachId: course.coachId,
        datetime: target.toISOString(),
        room: 'Studio 1',
        status: 'scheduled',
      };
      dispatch({ type: 'ADD_SESSION', payload: newSession });
      toast({ title: `${course.name} added — ${formatHour(hour)}` });
      dragCourse.current = null;
    } else if (dragSession.current) {
      const session = state.sessions.find(s => s.id === dragSession.current);
      if (!session) return;
      dispatch({ type: 'UPDATE_SESSION', payload: { ...session, datetime: target.toISOString() } });
      toast({ title: 'Session rescheduled' });
      dragSession.current = null;
    }
  };

  const handleDelete = (sessionId: string) => {
    dispatch({ type: 'DELETE_SESSION', payload: sessionId });
    setActiveSessionId(null);
    toast({ title: 'Session removed' });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* Top bar */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-1">
          <h1 className="font-serif text-lg font-semibold text-foreground mr-2">Calendar</h1>
          <button type="button" onClick={prevWeek} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground px-2 min-w-[200px] text-center">{weekLabel}</span>
          <button type="button" onClick={nextWeek} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Course palette */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <span className="text-xs text-muted-foreground">Drag to schedule</span>
          {state.courses.map(course => (
            <div
              key={course.id}
              draggable
              onDragStart={() => { dragCourse.current = course.id; dragSession.current = null; }}
              onDragEnd={() => { dragCourse.current = null; }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                'cursor-grab active:cursor-grabbing active:opacity-50 select-none border',
                `bg-${course.type}-pale text-${course.type} border-${course.type}/25`
              )}
            >
              <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', `bg-${course.type}`)} />
              {course.name}
            </div>
          ))}
        </div>
      </div>

      {/* Week grid */}
      <div className="flex-1 overflow-auto" onClick={() => setActiveSessionId(null)}>
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
                <span className="text-[10px] text-muted-foreground/70 leading-none">{formatHour(hour)}</span>
              </div>

              {weekDays.map((_, dayIdx) => {
                const sessions = getSlotSessions(dayIdx, hour);
                const isHovered = hoverSlot?.d === dayIdx && hoverSlot?.h === hour;

                return (
                  <div
                    key={dayIdx}
                    onDragOver={e => { e.preventDefault(); setHoverSlot({ d: dayIdx, h: hour }); }}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setHoverSlot(null);
                    }}
                    onDrop={e => handleDrop(dayIdx, hour, e)}
                    className={cn(
                      'min-h-[44px] p-0.5 border-r border-border/25 transition-colors relative',
                      dayIdx === 6 && 'border-r-0',
                      isHovered ? 'bg-primary/8' : 'hover:bg-muted/20'
                    )}
                  >
                    {isHovered && sessions.length === 0 && (
                      <div className="absolute inset-0.5 rounded border-2 border-dashed border-primary/30 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-primary/50 font-medium">Drop here</span>
                      </div>
                    )}

                    {sessions.map(s => {
                      const course = getCourse(s.courseId);
                      if (!course) return null;
                      const coach = getUser(s.coachId);
                      const isActive = activeSessionId === s.id;
                      const popoverSide = dayIdx >= 4 ? 'right-full mr-1' : 'left-full ml-1';

                      return (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={e => { e.stopPropagation(); dragSession.current = s.id; dragCourse.current = null; }}
                          onDragEnd={() => { dragSession.current = null; }}
                          onClick={e => { e.stopPropagation(); setActiveSessionId(isActive ? null : s.id); }}
                          className={cn(
                            'relative w-full px-1.5 py-1 rounded text-xs font-medium mb-0.5 border',
                            'cursor-grab active:cursor-grabbing active:opacity-60 select-none transition-all',
                            `bg-${course.type}-pale text-${course.type} border-${course.type}/25`,
                            isActive && 'ring-1 ring-current ring-offset-1'
                          )}
                        >
                          <div className="truncate leading-tight">{course.name}</div>
                          <div className="opacity-55 text-[10px]">{formatTime(s.datetime)}</div>

                          {isActive && (
                            <div
                              className={cn('absolute top-0 z-30 w-44 bg-card border border-border rounded-lg shadow-card-hover p-3', popoverSide)}
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="font-semibold text-foreground text-xs leading-snug">{course.name}</div>
                                <button type="button" onClick={() => setActiveSessionId(null)}
                                  className="text-muted-foreground hover:text-foreground shrink-0 ml-1">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                                <div>{formatTime(s.datetime)} · {course.duration} min</div>
                                <div>{coach?.name}</div>
                                <div>{s.room}</div>
                              </div>
                              <button type="button"
                                className="flex items-center gap-1 text-xs text-destructive hover:opacity-70 transition-opacity"
                                onClick={() => handleDelete(s.id)}
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>
                            </div>
                          )}
                        </div>
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
