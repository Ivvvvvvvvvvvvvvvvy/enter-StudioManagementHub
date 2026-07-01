import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatTime, getCourseTypeSolidClass } from '@/components/shared/badges';
import {
  ArrowLeft, Clock, MapPin, Users, Flame, Target, Star, CalendarDays, ChevronRight, MessageSquare
} from 'lucide-react';
import type { Conversation } from '@/lib/types';

// ── Type color accent map ─────────────────────────────────────────────────────
const TYPE_ACCENT: Record<string, { bg: string; text: string; bar: string }> = {
  yoga:       { bg: 'bg-sky-500/20',     text: 'text-sky-300',     bar: 'bg-sky-400' },
  pilates:    { bg: 'bg-orange-500/20',  text: 'text-orange-300',  bar: 'bg-orange-400' },
  meditation: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', bar: 'bg-emerald-400' },
};

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ sessionId }: { sessionId: string }) {
  const { getCoachSessions: _, getCourse, getBookingCount } = useStore();
  const navigate = useNavigate();
  const { state } = useStore();
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return null;
  const course = getCourse(session.courseId);
  if (!course) return null;
  const booked = getBookingCount(session.id);
  const pct = Math.round((booked / course.capacity) * 100);
  const isFull = booked >= course.capacity;
  const dt = new Date(session.datetime);

  return (
    <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
      onClick={() => navigate(`/courses/${course.id}`)}>
      <div className={cn('h-1.5', getCourseTypeSolidClass(course.type))} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className={cn('text-[10px] font-bold uppercase tracking-widest capitalize', `text-${course.type === 'yoga' ? 'sky' : course.type === 'pilates' ? 'orange' : 'emerald'}-600`)}>
              {course.type}
            </span>
            <h3 className="font-bold text-foreground leading-tight mt-0.5">{course.name}</h3>
          </div>
          {isFull && (
            <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full shrink-0">Full</span>
          )}
        </div>
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {formatTime(session.datetime)} · {course.duration} min
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {session.room}
          </div>
        </div>
        {/* Capacity bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booked} / {course.capacity}</span>
            <span>{pct}% full</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', getCourseTypeSolidClass(course.type))}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Button size="sm" variant={isFull ? 'outline' : 'default'} disabled={isFull} className="w-full text-xs">
          {isFull ? 'View Class' : 'Book Now'} <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CoachProfilePage() {
  const { coachId } = useParams<{ coachId: string }>();
  const navigate = useNavigate();
  const { getUser, getCoachSessions, getCourse, getBookingCount, state, dispatch } = useStore();
  const { user } = useAuth();

  const coach = getUser(coachId ?? '');
  const allSessions = getCoachSessions(coachId ?? '');
  const userId = user?.userId ?? '';

  // Open or create conversation with this coach
  function messageCoach() {
    if (!coachId) return;
    const existing = state.conversations.find(
      c => c.customerId === userId && c.participantId === coachId
    );
    if (existing) {
      navigate('/messages', { state: { convId: existing.id } });
      return;
    }
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      customerId: userId,
      participantId: coachId,
      participantRole: 'coach',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CONVERSATION', payload: newConv });
    navigate('/messages', { state: { convId: newConv.id } });
  }

  // Upcoming sessions
  const upcomingSessions = useMemo(() =>
    allSessions
      .filter(s => s.status === 'scheduled' && new Date(s.datetime) > new Date())
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
      .slice(0, 9),
    [allSessions]
  );

  // Class type stats
  const typeStats = useMemo(() => {
    const upcoming = allSessions.filter(s => s.status === 'scheduled' && new Date(s.datetime) > new Date());
    const map = new Map<string, number>();
    upcoming.forEach(s => {
      const c = getCourse(s.courseId);
      if (c) map.set(c.type, (map.get(c.type) ?? 0) + 1);
    });
    return Array.from(map.entries());
  }, [allSessions, getCourse]);

  const completedCount = allSessions.filter(s => s.status === 'completed').length;
  const maxTypeCount = Math.max(...typeStats.map(([, n]) => n), 1);

  if (!coach) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">Coach not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[55%_45%] min-h-[460px]">

        {/* Left: Light panel */}
        <div className="relative bg-card flex flex-col justify-between px-10 py-10 overflow-hidden">
          {/* Decorative gym lines */}
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-primary/4 pointer-events-none" />

          <div>
            {/* Back + studio tag */}
            <div className="flex items-center gap-3 mb-8">
              <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-primary/70 border border-primary/20 px-2.5 py-1 rounded-full">
                Zenith Studio Instructor
              </span>
            </div>

            {/* Bold name headline */}
            <p className="text-sm font-black tracking-[0.15em] uppercase text-muted-foreground/50 mb-1">TRAIN WITH</p>
            <h1 className="font-black uppercase leading-none tracking-tight mb-1" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
              {coach.name.split(' ')[0]}
            </h1>
            <h1 className="font-black uppercase leading-none tracking-tight text-primary mb-6" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
              {coach.name.split(' ').slice(1).join(' ')}
            </h1>

            {/* Specialties */}
            {(coach.specialties?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {coach.specialties!.map(s => (
                  <span key={s} className="text-xs px-3 py-1 rounded-full border border-primary/25 text-primary font-semibold bg-primary/5">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Bio */}
            {coach.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-7">
                {coach.bio}
              </p>
            )}

            {/* CTAs */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button className="font-bold px-6" onClick={() => navigate('/private')}>
                Book Private Session
              </Button>
              <Button variant="outline" className="font-bold px-6" onClick={() => navigate('/courses')}>
                Browse Classes
              </Button>
              {user?.role === 'customer' && (
                <Button variant="outline" className="font-bold px-4 gap-2" onClick={messageCoach}>
                  <MessageSquare className="w-4 h-4" /> Message
                </Button>
              )}
            </div>
          </div>

          {/* Stats bar at bottom */}
          <div className="flex items-center gap-6 mt-8 pt-6 border-t border-border">
            <div className="text-center">
              <div className="font-black text-2xl text-foreground">{upcomingSessions.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Upcoming</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="font-black text-2xl text-foreground">{completedCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Classes Taught</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="font-black text-2xl text-foreground">
                {coach.privateLessonPrice ? `¥${coach.privateLessonPrice}` : 'TBD'}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Per Session</div>
            </div>
          </div>
        </div>

        {/* Right: Dark panel with photo + class type stats */}
        <div className="relative bg-[#111] overflow-hidden flex items-stretch">
          {/* Photo */}
          {coach.avatar ? (
            <img
              src={coach.avatar}
              alt={coach.name}
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#111]/50 via-transparent to-[#111]/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111]/80 via-transparent to-transparent" />

          {/* Class type stats — right edge */}
          {typeStats.length > 0 && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 space-y-4 min-w-[130px]">
              {typeStats.map(([type, count]) => {
                const accent = TYPE_ACCENT[type] ?? { bg: 'bg-white/10', text: 'text-white/70', bar: 'bg-white/40' };
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', accent.bg)}>
                      <Flame className={cn('w-5 h-5', accent.text)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white capitalize">{type}</span>
                        <span className="text-xs font-black text-white ml-2">{count}</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                        <div className={cn('h-full rounded-full', accent.bar)}
                          style={{ width: `${Math.round((count / maxTypeCount) * 100)}%` }} />
                      </div>
                      <div className={cn('text-[9px] mt-0.5', accent.text)}>classes upcoming</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom info strip */}
          <div className="absolute bottom-0 left-0 right-0 z-10 px-6 py-5 flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold text-white">Top Instructor</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Target className="w-3.5 h-3.5 text-white/80" />
              <span className="text-xs font-bold text-white">{coach.specialties?.[0]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming Classes ───────────────────────────────────────────────── */}
      <div className="px-10 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary/70 mb-1">Schedule</p>
            <h2 className="font-black text-2xl text-foreground uppercase tracking-tight">Upcoming Classes</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/courses')}>
            View All Classes
          </Button>
        </div>

        {upcomingSessions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-foreground">No upcoming classes scheduled</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingSessions.map(s => (
              <SessionCard key={s.id} sessionId={s.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
