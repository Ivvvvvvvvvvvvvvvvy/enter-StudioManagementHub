import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { formatTime, getCourseTypeSolidClass } from '@/components/shared/badges';
import { ChevronRight, Clock, Users, CalendarDays, Flame, TrendingDown, TrendingUp, CreditCard, ArrowRight, BookOpen, Plus, Dumbbell, Apple, Leaf, Coffee, Target, Trophy, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
const TYPE_BG: Record<string, string> = {
  yoga: 'bg-[#eef4f7] dark:bg-sky-900/20 border-[#d4e8f0] dark:border-sky-800/30',
  pilates: 'bg-[#fef6ee] dark:bg-orange-900/15 border-[#fde3c8] dark:border-orange-800/25',
  meditation: 'bg-[#f0f7f0] dark:bg-green-900/15 border-[#cce8cc] dark:border-green-800/25'
};
const TYPE_ICON_BG: Record<string, string> = {
  yoga: 'bg-[#c8dfe8] dark:bg-sky-800/40 text-sky-600 dark:text-sky-400',
  pilates: 'bg-[#fbd4ab] dark:bg-orange-800/30 text-orange-500',
  meditation: 'bg-[#b8dbb8] dark:bg-green-800/30 text-green-600'
};
const TYPE_COLOR: Record<string, string> = {
  yoga: '#4a9db5',
  pilates: '#f5994e',
  meditation: '#5ab55a'
};
const APPT_COLORS = ['bg-[#e8eef7] text-[#4a6fa5]', 'bg-[#fff0e8] text-[#c96a2a]', 'bg-[#e8f5e8] text-[#3a8a3a]', 'bg-[#f7e8f7] text-[#8a3a8a]'];
function typeBg(t: string) {
  return TYPE_BG[t] ?? 'bg-muted/40 border-border';
}
function typeIconBg(t: string) {
  return TYPE_ICON_BG[t] ?? 'bg-muted text-muted-foreground';
}
function typeColor(t: string) {
  return TYPE_COLOR[t] ?? '#888';
}
const FOOD_RECS = [{
  name: 'Green Smoothie',
  sub: 'Pre-class fuel · 30min before',
  days: '5 days',
  icon: <Leaf className="w-5 h-5" />,
  bg: 'bg-green-100 dark:bg-green-900/30 text-green-600'
}, {
  name: 'Quinoa Bowl',
  sub: 'Post-class recovery',
  days: '3 days',
  icon: <Apple className="w-5 h-5" />,
  bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
}, {
  name: 'Chamomile Tea',
  sub: 'Evening unwind ritual',
  days: '7 days',
  icon: <Coffee className="w-5 h-5" />,
  bg: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600'
}];

// ── TypeStatCard ──────────────────────────────────────────────────────────────

interface TypeStatCardProps {
  type: string;
  attended: number;
  upcoming: number;
  totalEnrolled: number;
  coachAvatar?: string;
  coachName?: string;
  calories?: number;
  onClick: () => void;
}
function TypeStatCard({
  type,
  attended,
  upcoming,
  totalEnrolled,
  coachAvatar,
  coachName,
  calories,
  onClick
}: TypeStatCardProps) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  const stats = [
    { label: 'Attended', value: attended },
    { label: 'Upcoming', value: upcoming },
    { label: 'Enrolled', value: totalEnrolled },
  ];
  return (
    <div onClick={onClick} className={cn('rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all w-[200px] shrink-0 snap-start', typeBg(type))}>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-xl overflow-hidden shrink-0', !coachAvatar && cn('flex items-center justify-center', typeIconBg(type)))}>
          {coachAvatar ? (
            <img src={coachAvatar} alt={coachName} crossOrigin="anonymous" className="w-full h-full object-cover object-top" />
          ) : (
            <Dumbbell className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-foreground text-base leading-tight">{label}</div>
          {coachName && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{coachName}</div>}
        </div>
      </div>
      {/* Calories badge */}
      {calories && (
        <div className="flex items-center gap-1 mb-3">
          <Flame className="w-3 h-3 text-orange-500" />
          <span className="text-[11px] font-medium text-orange-600 dark:text-orange-400">~{calories} kcal / class</span>
        </div>
      )}
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-1 border-t border-black/5 dark:border-white/10 pt-3">
        {stats.map(s => (
          <div key={s.label} className="flex flex-col items-center gap-0.5">
            <span className="text-base font-semibold text-foreground">{s.value}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────

function MiniCalendar({
  bookedDates,
  typeForDate,
  chartTypes
}: {
  bookedDates: Set<string>;
  typeForDate: Map<string, string>;
  chartTypes: string[];
}) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDayOfMonth + 6) % 7;
  const cells = Array.from({
    length: offset + daysInMonth
  }, (_, i) => i < offset ? null : i - offset + 1);
  const monthLabel = today.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
  return <div>
      <div className="flex items-center justify-between mb-3">
        <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180 cursor-pointer hover:text-foreground" />
        <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground font-medium mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
        if (!day) return <div key={`e-${idx}`} />;
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = day === today.getDate();
        const hasClass = bookedDates.has(dateKey);
        const type = typeForDate.get(dateKey) ?? '';
        return <div key={dateKey} className={cn('aspect-square flex flex-col items-center justify-center text-[11px] font-medium rounded-full', isToday ? 'bg-primary text-primary-foreground' : 'text-foreground')}>
              {day}
              {hasClass && !isToday && <div className="w-1 h-1 rounded-full mt-px" style={{
            backgroundColor: typeColor(type) || '#888'
          }} />}
            </div>;
      })}
      </div>
      {chartTypes.length > 0 && <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-x-3 gap-y-1">
          {chartTypes.map(type => <div key={type} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{
          backgroundColor: typeColor(type)
        }} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </div>)}
        </div>}
    </div>;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CustomerHomePage() {
  const {
    state,
    getCourse,
    getUser,
    getCustomerBookings,
    getCustomerCards,
    getBookingCount,
    getCustomerPrivateLessons
  } = useStore();
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const customerId = user?.userId ?? '';

  // ── Membership ───────────────────────────────────────────────────────────────
  const {
    activeCard,
    daysLeft
  } = useMemo(() => {
    const cards = getCustomerCards(customerId);
    const active = cards.find(c => c.isActive) ?? null;
    const left = active ? Math.max(0, Math.ceil((new Date(active.expiry).getTime() - Date.now()) / 86400000)) : 0;
    return {
      activeCard: active,
      daysLeft: left
    };
  }, [customerId, getCustomerCards, state.cards]);

  // ── All bookings ─────────────────────────────────────────────────────────────
  const allBookings = useMemo(() => getCustomerBookings(customerId), [customerId, getCustomerBookings, state.bookings]);

  // ── Stats by type ────────────────────────────────────────────────────────────
  const typeStats = useMemo(() => {
    const now = new Date();
    return Array.from(new Set(state.courses.map(c => c.type))).map(type => {
      const courseIds = new Set(state.courses.filter(c => c.type === type).map(c => c.id));
      let attended = 0,
        upcoming = 0,
        totalEnrolled = 0;
      allBookings.forEach(b => {
        const session = state.sessions.find(s => s.id === b.sessionId);
        if (!session || !courseIds.has(session.courseId)) return;
        if (b.status === 'attended') attended++;
        if (b.status === 'confirmed' && new Date(session.datetime) > now) upcoming++;
      });
      state.sessions.forEach(s => {
        if (courseIds.has(s.courseId) && s.status === 'scheduled') totalEnrolled += getBookingCount(s.id);
      });
      // Find the coach for this course type
      const coachId = state.courses.find(c => c.type === type)?.coachId;
      const coach = coachId ? getUser(coachId) : undefined;
      // Average calories across courses of this type
      const typeCourses = state.courses.filter(c => c.type === type && c.calories);
      const avgCalories = typeCourses.length
        ? Math.round(typeCourses.reduce((s, c) => s + (c.calories ?? 0), 0) / typeCourses.length)
        : undefined;
      return {
        type,
        attended,
        upcoming,
        totalEnrolled,
        coachAvatar: coach?.avatar,
        coachName: coach?.name,
        calories: avgCalories,
      };
    });
  }, [state.courses, state.sessions, allBookings, getBookingCount, getUser]);
  const chartTypes = Array.from(new Set(state.courses.map(c => c.type)));

  // ── Weight goal tracker ───────────────────────────────────────────────────────
  const weightGoal = useMemo(() => {
    const u = getUser(customerId);
    if (!u?.startWeight || !u?.targetWeight || !u?.currentWeight) return null;
    const { startWeight, currentWeight, targetWeight, weightGoalStartDate, height } = u;
    const totalToLose = startWeight - targetWeight;
    const lost = startWeight - currentWeight;
    const toGo = currentWeight - targetWeight;
    const pct = totalToLose > 0 ? Math.min(100, Math.round((lost / totalToLose) * 100)) : 0;
    const daysSinceStart = weightGoalStartDate
      ? Math.floor((Date.now() - new Date(weightGoalStartDate).getTime()) / 86400000)
      : 0;
    const classesAttended = allBookings.filter(b => b.status === 'attended').length;
    const totalCalories = allBookings
      .filter(b => b.status === 'attended')
      .reduce((sum, b) => {
        const s = state.sessions.find(x => x.id === b.sessionId);
        const c = s ? getCourse(s.courseId) : undefined;
        return sum + (c?.calories ?? 0);
      }, 0);
    const avgClassesPerWeek = daysSinceStart > 0 ? ((classesAttended / daysSinceStart) * 7).toFixed(1) : '0';
    const bmi = height ? (currentWeight / ((height / 100) ** 2)).toFixed(1) : null;
    const startBmi = height ? (startWeight / ((height / 100) ** 2)).toFixed(1) : null;
    const daysToGoal = lost > 0 && daysSinceStart > 0
      ? Math.round((toGo / lost) * daysSinceStart)
      : null;
    const motivationalMsg =
      pct >= 80 ? "Almost there — you're crushing it!"
      : pct >= 60 ? "More than halfway! Keep the momentum."
      : pct >= 40 ? "Great progress — don't stop now!"
      : pct >= 20 ? "You've started strong. Every class counts."
      : "Your journey starts here. Stay consistent!";
    return { startWeight, currentWeight, targetWeight, totalToLose, lost, toGo, pct, daysSinceStart, classesAttended, totalCalories, avgClassesPerWeek, bmi, startBmi, daysToGoal, motivationalMsg };
  }, [customerId, getUser, allBookings, state.sessions, getCourse]);

  // ── Upcoming bookings ────────────────────────────────────────────────────────
  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return allBookings.filter(b => b.status === 'confirmed' && (() => {
      const s = state.sessions.find(x => x.id === b.sessionId);
      return s && new Date(s.datetime) > now;
    })()).sort((a, b) => {
      const sa = state.sessions.find(s => s.id === a.sessionId)!;
      const sb = state.sessions.find(s => s.id === b.sessionId)!;
      return new Date(sa.datetime).getTime() - new Date(sb.datetime).getTime();
    }).slice(0, 5);
  }, [allBookings, state.sessions]);

  // ── Today's class ────────────────────────────────────────────────────────────
  const todayBooking = useMemo(() => {
    const today = new Date().toDateString();
    return upcomingBookings.find(b => {
      const s = state.sessions.find(x => x.id === b.sessionId);
      return s && new Date(s.datetime).toDateString() === today;
    }) ?? upcomingBookings[0] ?? null;
  }, [upcomingBookings, state.sessions]);

  // ── Private lessons ──────────────────────────────────────────────────────────
  const privateLessons = useMemo(() => {
    const now = new Date();
    return getCustomerPrivateLessons(customerId).filter(pl => pl.status !== 'cancelled' && new Date(pl.scheduledAt) > now).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).slice(0, 5);
  }, [customerId, getCustomerPrivateLessons, state.privateLessons]);

  // ── Calendar dates ───────────────────────────────────────────────────────────
  const {
    bookedDates,
    typeForDate
  } = useMemo(() => {
    const dates = new Set<string>();
    const typeMap = new Map<string, string>();
    const now = new Date();
    allBookings.forEach(b => {
      if (b.status !== 'confirmed' && b.status !== 'attended') return;
      const s = state.sessions.find(x => x.id === b.sessionId);
      if (!s) return;
      const dt = new Date(s.datetime);
      if (dt.getMonth() !== now.getMonth() || dt.getFullYear() !== now.getFullYear()) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      dates.add(key);
      const c = getCourse(s.courseId);
      if (c && !typeMap.has(key)) typeMap.set(key, c.type);
    });
    return {
      bookedDates: dates,
      typeForDate: typeMap
    };
  }, [allBookings, state.sessions, getCourse]);

  // ── Profile stats ────────────────────────────────────────────────────────────
  const totalAttended = allBookings.filter(b => b.status === 'attended').length;
  const totalHours = useMemo(() => allBookings.filter(b => b.status === 'attended').reduce((acc, b) => {
    const s = state.sessions.find(x => x.id === b.sessionId);
    const c = s ? getCourse(s.courseId) : undefined;
    return acc + (c?.duration ?? 60) / 60;
  }, 0), [allBookings, state.sessions, getCourse]);
  const streak = useMemo(() => {
    let s = 0;
    for (let w = 0; w < 12; w++) {
      const ws = new Date();
      ws.setDate(ws.getDate() - ws.getDay() - w * 7);
      ws.setHours(0, 0, 0, 0);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      const ok = allBookings.some(b => {
        if (b.status !== 'attended' && b.status !== 'confirmed') return false;
        const sx = state.sessions.find(x => x.id === b.sessionId);
        if (!sx) return false;
        const dt = new Date(sx.datetime);
        return dt >= ws && dt < we;
      });
      if (ok) s++;else if (w > 0) break;
    }
    return s;
  }, [allBookings, state.sessions]);
  const cardLabel: Record<string, string> = {
    monthly: 'Monthly Pass',
    sessions: 'Class Pack',
    annual: 'Annual Pass'
  };
  const memberSince = state.users.find(u => u.id === customerId)?.joinDate ?? '';
  return <div className="flex-1 overflow-y-auto bg-[#f7f8fc] dark:bg-background">
      <div className="p-5 max-w-[1400px] mx-auto">

        {/* ── Main grid: left 3/4 + right 1/4 ─────────────────────────────── */}
        <div className="grid grid-cols-[1fr_260px] gap-4 items-start">

          {/* ══ LEFT ══════════════════════════════════════════════════════════ */}
          <div className="space-y-4 min-w-0">

            {/* Header inside left column */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-bold text-2xl text-foreground">Hi {firstName}!</h1>
                <p className="text-muted-foreground text-sm mt-0.5">Train hard, show up, feel your best!</p>
              </div>
              <Button size="sm" onClick={() => navigate('/courses')}>
                Browse Classes <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {typeStats.map(ts => <TypeStatCard key={ts.type} {...ts} onClick={() => navigate('/courses')} />)}
            </div>

            {/* Row 2 — Activity chart + Today's Class */}
            <div className="grid grid-cols-[3fr_2fr] gap-4">

              {/* Activity chart — unchanged */}
              {/* Fit Goal Tracker */}
              {weightGoal ? (
                <div
                  className="bg-card rounded-2xl border border-border p-5 overflow-hidden relative cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/health-profile')}
                >
                  {/* subtle gradient accent */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none rounded-2xl" />

                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      <h2 className="font-semibold text-foreground">Fit Goal</h2>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
                        Day {weightGoal.daysSinceStart}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>

                  {/* Weight scale: start → current → target */}
                  <div className="mb-4">
                    <div className="flex items-end justify-between mb-2 text-[11px] text-muted-foreground">
                      <span>Start<br /><span className="text-base font-bold text-foreground">{weightGoal.startWeight}<span className="text-xs font-normal"> kg</span></span></span>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-medium text-primary mb-0.5">NOW</span>
                        <span className="text-xl font-extrabold text-foreground">{weightGoal.currentWeight}<span className="text-xs font-normal"> kg</span></span>
                      </div>
                      <span className="text-right">Goal<br /><span className="text-base font-bold text-foreground">{weightGoal.targetWeight}<span className="text-xs font-normal"> kg</span></span></span>
                    </div>

                    {/* Progress track */}
                    <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700"
                        style={{ width: `${weightGoal.pct}%` }}
                      />
                      {/* current marker */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-sm -translate-x-1/2 transition-all duration-700"
                        style={{ left: `${weightGoal.pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>{weightGoal.pct}% complete</span>
                      <span>{weightGoal.toGo > 0 ? `${weightGoal.toGo} kg to go` : 'Goal reached!'}</span>
                    </div>
                  </div>

                  {/* Key stats grid */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { icon: <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />, value: `-${weightGoal.lost} kg`, label: 'Lost', color: 'text-emerald-600 dark:text-emerald-400' },
                      { icon: <Flame className="w-3.5 h-3.5 text-orange-500" />, value: `${(weightGoal.totalCalories / 1000).toFixed(0)}k`, label: 'kcal', color: 'text-orange-500' },
                      { icon: <Zap className="w-3.5 h-3.5 text-primary" />, value: String(weightGoal.classesAttended), label: 'Classes', color: 'text-primary' },
                      { icon: <Star className="w-3.5 h-3.5 text-amber-500" />, value: `${weightGoal.avgClassesPerWeek}x`, label: '/week', color: 'text-amber-500' },
                    ].map(s => (
                      <div key={s.label} className="flex flex-col items-center gap-0.5 bg-muted/50 rounded-xl py-2.5">
                        {s.icon}
                        <span className={cn('text-sm font-bold', s.color)}>{s.value}</span>
                        <span className="text-[10px] text-muted-foreground">{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* BMI + Projection row */}
                  <div className="flex gap-2 mb-4">
                    {weightGoal.bmi && weightGoal.startBmi && (
                      <div className="flex-1 bg-muted/40 rounded-xl px-3 py-2">
                        <div className="text-[10px] text-muted-foreground mb-0.5">BMI Change</div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-foreground">{weightGoal.bmi}</span>
                          <span className="text-[10px] text-muted-foreground line-through">{weightGoal.startBmi}</span>
                        </div>
                      </div>
                    )}
                    {weightGoal.daysToGoal !== null && weightGoal.daysToGoal > 0 && (
                      <div className="flex-1 bg-muted/40 rounded-xl px-3 py-2">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Projected finish</div>
                        <div className="text-sm font-bold text-foreground">~{weightGoal.daysToGoal} days</div>
                      </div>
                    )}
                    {weightGoal.toGo <= 0 && (
                      <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Goal Reached!</span>
                      </div>
                    )}
                  </div>

                  {/* Motivational message */}
                  <div className="bg-primary/8 dark:bg-primary/10 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                    <Trophy className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs font-medium text-primary">{weightGoal.motivationalMsg}</p>
                  </div>
                </div>
              ) : null}

              {/* Today's Class */}
              <div className="bg-card rounded-2xl border border-border p-5 flex flex-col">
                <h2 className="font-semibold text-foreground mb-4">Today's Class</h2>
                {todayBooking ? (() => {
                const session = state.sessions.find(s => s.id === todayBooking.sessionId)!;
                const course = getCourse(session.courseId);
                const coach = getUser(session.coachId);
                const dt = new Date(session.datetime);
                const isToday = dt.toDateString() === new Date().toDateString();
                return <div className="flex flex-col items-center flex-1">
                      <div className={cn('w-16 h-16 rounded-2xl overflow-hidden mb-3', !coach?.avatar && cn('flex items-center justify-center', typeIconBg(course?.type ?? '')))}>
                        {coach?.avatar ? (
                          <img src={coach.avatar} alt={coach.name} crossOrigin="anonymous" className="w-full h-full object-cover object-top" />
                        ) : (
                          <BookOpen className="w-7 h-7" />
                        )}
                      </div>
                      <div className="font-bold text-foreground text-center mb-1">{course?.name}</div>
                      <div className="text-xs text-muted-foreground mb-4">{isToday ? 'Today' : dt.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}</div>
                      <div className="w-full space-y-3">
                        {[{
                      label: 'Time',
                      value: formatTime(session.datetime),
                      progress: 60
                    }, {
                      label: 'Coach',
                      value: coach?.name?.split(' ')[0] ?? '—',
                      progress: 80
                    }].map((item, i) => <div key={i}>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>{item.label}</span>
                              <span className="font-medium text-foreground">{item.value}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{
                          width: `${item.progress}%`
                        }} />
                            </div>
                          </div>)}
                      </div>
                      <button onClick={() => navigate(`/booking/${session.id}`)} className="mt-4 text-xs text-primary hover:underline flex items-center gap-0.5">
                        View details <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>;
              })() : <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mb-2 opacity-25" />
                    <p className="text-sm font-medium text-foreground mb-1">No class today</p>
                    <p className="text-xs mb-3">Book a session to get started</p>
                    <Button size="sm" variant="outline" onClick={() => navigate('/courses')}>Browse →</Button>
                  </div>}
              </div>
            </div>

            {/* Row 3 — Recommended Food + Class Appointments + Private Sessions */}
            <div className="grid grid-cols-3 gap-4">

              {/* Recommended Food */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h2 className="font-semibold text-foreground mb-4">Recommended Food</h2>
                <div className="space-y-3">
                  {FOOD_RECS.map((food, i) => <div key={i} className="flex items-center gap-3">
                      <div className={cn('w-11 h-11 rounded-full flex items-center justify-center shrink-0', food.bg)}>
                        {food.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{food.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{food.sub}</div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{food.days}</span>
                    </div>)}
                </div>
              </div>

              {/* Class Appointments */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">Class Appointments</h2>
                  
                </div>
                {upcomingBookings.length === 0 ? <div className="text-center py-4 text-sm text-muted-foreground">No upcoming bookings</div> : <div className="space-y-2.5">
                    {upcomingBookings.slice(0, 4).map((booking, i) => {
                  const session = state.sessions.find(s => s.id === booking.sessionId);
                  if (!session) return null;
                  const course = getCourse(session.courseId);
                  if (!course) return null;
                  const dt = new Date(session.datetime);
                  return <div key={booking.id} onClick={() => navigate(`/booking/${session.id}`)} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-1.5 rounded-xl transition-colors">
                          <div className={cn('w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold shrink-0', APPT_COLORS[i % APPT_COLORS.length])}>
                            <span className="text-base leading-none">{dt.getDate()}</span>
                            <span className="text-[9px] opacity-70">{dt.toLocaleDateString('en-US', {
                          month: 'short'
                        })}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{course.name}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTime(session.datetime)} · {session.room}
                            </div>
                          </div>
                          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', getCourseTypeSolidClass(course.type))} />
                        </div>;
                })}
                  </div>}
                <button onClick={() => navigate('/my-bookings')} className="text-xs text-primary hover:underline mt-3 flex items-center gap-0.5">
                  View more <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Private Sessions */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">Private Sessions</h2>
                </div>
                {privateLessons.length === 0 ? <div className="text-center py-3">
                    <p className="text-sm text-muted-foreground mb-2">No upcoming private sessions</p>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate('/private')}>
                      Book Private →
                    </Button>
                  </div> : <div className="space-y-2.5">
                    {privateLessons.map(pl => {
                  const coach = getUser(pl.coachId);
                  const course = getCourse(pl.courseId);
                  const dt = new Date(pl.scheduledAt);
                  return <div key={pl.id} className="flex items-start gap-2.5 p-1.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate('/private')}>
                          <div className="w-4 h-4 mt-0.5 rounded-full border-2 border-primary/50 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{course?.name ?? 'Private Lesson'}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {dt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })} · {formatTime(pl.scheduledAt)}
                              {coach && ` · ${coach.name.split(' ')[0]}`}
                            </div>
                          </div>
                        </div>;
                })}
                  </div>}
                <button onClick={() => navigate('/private')} className="text-xs text-primary hover:underline mt-3 flex items-center gap-0.5">
                  View more <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* ══ RIGHT ══════════════════════════════════════════════════════════ */}
          <div className="space-y-4 border-l border-border/50 pl-4">

            {/* Profile */}
            {/* Avatar card */}
            <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full ring-4 ring-primary/20 overflow-hidden mb-3">
                <img src={user?.avatar ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&q=80'} alt="Profile" crossOrigin="anonymous" className="w-full h-full object-cover" />
              </div>
              <div className="font-bold text-foreground text-base">{user?.name ?? 'Member'}</div>
              {activeCard && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1.5 font-medium">
                  {cardLabel[activeCard.type] ?? 'Member'}
                </span>}
            </div>

            {/* Info card */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="grid grid-cols-3 gap-1 text-center mb-4">
                {[{
                label: 'Classes',
                value: totalAttended
              }, {
                label: 'Hours',
                value: `${Math.round(totalHours)}h`
              }, {
                label: 'Streak',
                value: `${streak}w`
              }].map(s => <div key={s.label} className="bg-muted/40 rounded-xl p-2">
                    <div className="font-bold text-foreground text-sm">{s.value}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
                  </div>)}
              </div>

              {/* Extra profile info */}
              <div className="space-y-1.5 text-xs border-t border-border pt-3">
                {memberSince && <div className="flex justify-between text-muted-foreground">
                    <span>Member since</span>
                    <span className="font-medium text-foreground">{new Date(memberSince).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })}</span>
                  </div>}
                {activeCard && <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Plan</span>
                      <span className="font-medium text-foreground">{cardLabel[activeCard.type]}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Expires</span>
                      <span className={cn('font-medium', daysLeft <= 7 ? 'text-destructive' : 'text-foreground')}>
                        {daysLeft}d left
                      </span>
                    </div>
                    {activeCard.totalSessions !== null && <div className="pt-1">
                        <div className="flex justify-between text-muted-foreground mb-1">
                          <span>Classes used</span>
                          <span className="font-medium text-foreground">{activeCard.usedSessions}/{activeCard.totalSessions}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{
                      width: `${activeCard.usedSessions / activeCard.totalSessions * 100}%`
                    }} />
                        </div>
                      </div>}
                  </>}
              </div>

              {!activeCard && <Button size="sm" variant="outline" className="mt-3 w-full h-8 text-xs" onClick={() => navigate('/renewal')}>
                  <CreditCard className="w-3 h-3 mr-1" /> Get a Pass
                </Button>}
              {activeCard && daysLeft <= 14 && <Button size="sm" className="mt-3 w-full h-8 text-xs" onClick={() => navigate('/renewal')}>
                  Renew Now
                </Button>}
            </div>

            {/* Calendar */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <MiniCalendar bookedDates={bookedDates} typeForDate={typeForDate} chartTypes={chartTypes} />
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
              {[{
              label: 'Schedule',
              icon: <CalendarDays className="w-4 h-4" />,
              to: '/courses'
            }, {
              label: 'Bookings',
              icon: <TrendingUp className="w-4 h-4" />,
              to: '/my-bookings'
            }, {
              label: 'Private',
              icon: <Users className="w-4 h-4" />,
              to: '/private'
            }, {
              label: 'Membership',
              icon: <Flame className="w-4 h-4" />,
              to: '/renewal'
            }].map(item => <button key={item.to} type="button" onClick={() => navigate(item.to)} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary">
                  {item.icon}
                  <span className="text-[11px] font-medium">{item.label}</span>
                </button>)}
            </div>

          </div>
        </div>
      </div>
    </div>;
}