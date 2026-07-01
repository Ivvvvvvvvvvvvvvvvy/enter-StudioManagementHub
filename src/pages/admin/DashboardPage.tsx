import { useMemo, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CourseTypeBadge, formatTime, formatCurrency, formatDate } from '@/components/shared/badges';
import {
  Users, BookOpen, TrendingUp, CalendarDays, Clock, MapPin,
  AlertTriangle, AlertCircle, RefreshCw, UserX, ChevronRight, Bell,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { MembershipCard, User } from '@/lib/types';
import { avatarStyle } from '@/lib/avatar';

const MONTH_COLORS = ['#7c9885', '#8aaa93', '#98bba1', '#a6ccb0', '#b4ddbf', '#c2eece'];

// ── Membership health helpers ────────────────────────────────────────────────

type MemberStatus = 'active' | 'warning' | 'critical' | 'expired' | 'none' | 'low-credits';

function getMemberStatus(card: MembershipCard | undefined): MemberStatus {
  if (!card) return 'none';
  const daysLeft = Math.ceil((new Date(card.expiry).getTime() - Date.now()) / 86400000);
  if (daysLeft <= 0) return 'expired';
  if (daysLeft <= 7) return 'critical';
  if (daysLeft <= 30) return 'warning';
  if (card.totalSessions !== null && (card.totalSessions - card.usedSessions) <= 2) return 'low-credits';
  return 'active';
}

function getDaysLeft(card: MembershipCard) {
  return Math.ceil((new Date(card.expiry).getTime() - Date.now()) / 86400000);
}

// ── Alert row ────────────────────────────────────────────────────────────────

interface AlertRowProps {
  icon: React.ReactNode;
  label: string;
  members: { customer: User; card: MembershipCard; meta: string }[];
  colorClass: string;
  bgClass: string;
  onRemind: (name: string) => void;
  onView: (id: string) => void;
}

function AlertRow({ icon, label, members, colorClass, bgClass, onRemind, onView }: AlertRowProps) {
  if (members.length === 0) return null;
  return (
    <div className={cn('rounded-xl border p-4', bgClass)}>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('shrink-0', colorClass)}>{icon}</span>
        <span className={cn('text-sm font-semibold', colorClass)}>{label}</span>
        <span className={cn('ml-auto text-xs font-bold px-2 py-0.5 rounded-full', colorClass, bgClass, 'border')}>
          {members.length}
        </span>
      </div>
      <div className="space-y-2">
        {members.map(({ customer, card, meta }) => (
          <div key={customer.id} className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
              style={customer.avatar ? undefined : avatarStyle(customer.id)}>
              {customer.avatar
                ? <img src={customer.avatar} alt={customer.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                : customer.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-foreground truncate block">{customer.name}</span>
              <span className="text-xs text-muted-foreground">{meta}</span>
            </div>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs shrink-0"
              onClick={() => onView(customer.id)}>
              View
            </Button>
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs shrink-0 gap-1"
              onClick={() => onRemind(customer.name)}>
              <Bell className="w-2.5 h-2.5" /> Remind
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { state, getCourse, getUser, getBookingCount, getCustomerCards } = useStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auto-seed videos for newly-added courses that have no video yet
  useEffect(() => {
    const SEED_KEY = 'course_video_seed_v1';
    if (sessionStorage.getItem(SEED_KEY)) return;
    sessionStorage.setItem(SEED_KEY, '1');
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.functions.invoke('seed-missing-videos-fcd43878b98b').then(({ data }) => {
        if (data?.results) {
          const submitted = (data.results as Array<{ status: string }>).filter(r => r.status === 'submitted');
          if (submitted.length > 0) console.log(`[VideoSeed] Submitted ${submitted.length} task(s)`);
        }
      });
    });
  }, []);

  const totalMembers = state.users.filter(u => u.role === 'customer').length;
  const activeCards = state.cards.filter(c => c.isActive).length;
  const totalRevenue = state.orders.filter(o => o.status === 'paid').reduce((acc, o) => acc + o.amount, 0);
  const upcomingSessionsCount = state.sessions.filter(s => s.status === 'scheduled' && new Date(s.datetime) > new Date()).length;

  // Revenue by month (last 6 months)
  const revenueData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    state.orders.filter(o => o.status === 'paid').forEach(o => {
      const key = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short' });
      byMonth[key] = (byMonth[key] ?? 0) + o.amount;
    });
    return Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue })).slice(-6);
  }, [state.orders]);

  // Course type distribution
  const { typeCounts, typeTotal } = useMemo(() => {
    const counts: Record<string, number> = {};
    state.bookings.filter(b => b.status !== 'cancelled').forEach(b => {
      const s = state.sessions.find(x => x.id === b.sessionId);
      const c = s ? state.courses.find(x => x.id === s.courseId) : undefined;
      if (!c) return;
      const label = c.type.charAt(0).toUpperCase() + c.type.slice(1);
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return { typeCounts: counts, typeTotal: Object.values(counts).reduce((a, b) => a + b, 0) };
  }, [state.bookings, state.sessions, state.courses]);

  // ── Membership health segmentation ──────────────────────────────────────────
  const membershipAlerts = useMemo(() => {
    const customers = state.users.filter(u => u.role === 'customer');
    const critical: AlertRowProps['members'] = [];
    const warning: AlertRowProps['members'] = [];
    const expired: AlertRowProps['members'] = [];
    const lowCredits: AlertRowProps['members'] = [];
    const noPass: AlertRowProps['members'] = [];

    customers.forEach(customer => {
      const cards = getCustomerCards(customer.id);
      const activeCard = cards.find(c => c.isActive);
      const status = getMemberStatus(activeCard);

      if (status === 'critical' && activeCard) {
        const d = getDaysLeft(activeCard);
        critical.push({ customer, card: activeCard, meta: `Expires in ${d} day${d !== 1 ? 's' : ''} · ${activeCard.type}` });
      } else if (status === 'warning' && activeCard) {
        const d = getDaysLeft(activeCard);
        warning.push({ customer, card: activeCard, meta: `Expires ${formatDate(activeCard.expiry)} (${d}d) · ${activeCard.type}` });
      } else if (status === 'expired') {
        // find most recent expired card
        const recentExpired = cards.sort((a, b) => new Date(b.expiry).getTime() - new Date(a.expiry).getTime())[0];
        if (recentExpired) {
          const dAgo = Math.abs(getDaysLeft(recentExpired));
          expired.push({ customer, card: recentExpired, meta: `Expired ${dAgo} day${dAgo !== 1 ? 's' : ''} ago · ${recentExpired.type}` });
        }
      } else if (status === 'low-credits' && activeCard) {
        const rem = activeCard.totalSessions! - activeCard.usedSessions;
        lowCredits.push({ customer, card: activeCard, meta: `${rem} class${rem !== 1 ? 'es' : ''} remaining · expires ${formatDate(activeCard.expiry)}` });
      } else if (status === 'none') {
        noPass.push({ customer, card: {} as MembershipCard, meta: `No active pass · joined ${formatDate(customer.joinDate)}` });
      }
    });

    // Sort critical by urgency
    critical.sort((a, b) => getDaysLeft(a.card) - getDaysLeft(b.card));
    warning.sort((a, b) => getDaysLeft(a.card) - getDaysLeft(b.card));
    expired.sort((a, b) => new Date(b.card.expiry).getTime() - new Date(a.card.expiry).getTime());

    return { critical, warning, expired, lowCredits, noPass };
  }, [state.users, state.cards, getCustomerCards]);

  const totalAlerts = membershipAlerts.critical.length + membershipAlerts.warning.length +
    membershipAlerts.expired.length + membershipAlerts.lowCredits.length;

  const todaySessions = state.sessions
    .filter(s => new Date(s.datetime).toDateString() === new Date().toDateString())
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const handleRemind = (name: string) => {
    toast({ title: `Reminder sent to ${name}`, description: 'A membership renewal reminder has been queued.' });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="font-serif text-2xl font-semibold text-foreground">Dashboard</h1>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Members', value: totalMembers, icon: <Users className="w-5 h-5" />, color: 'text-yoga' },
          { label: 'Active Passes', value: activeCards, icon: <BookOpen className="w-5 h-5" />, color: 'text-pilates' },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: <TrendingUp className="w-5 h-5" />, color: 'text-meditation' },
          { label: 'Upcoming Classes', value: upcomingSessionsCount, icon: <CalendarDays className="w-5 h-5" />, color: 'text-primary' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className={cn('mb-2', stat.color)}>{stat.icon}</div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Membership Health ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold text-foreground">Membership Health</h2>
          {totalAlerts > 0 && (
            <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full font-bold">
              {totalAlerts} need attention
            </span>
          )}
          <button onClick={() => navigate('/admin/members')}
            className="ml-auto text-xs text-primary flex items-center gap-0.5 hover:underline">
            All members <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {totalAlerts === 0 && membershipAlerts.noPass.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
            All memberships are in good health.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AlertRow
              icon={<AlertCircle className="w-4 h-4" />}
              label="Expiring within 7 days"
              members={membershipAlerts.critical}
              colorClass="text-destructive"
              bgClass="bg-destructive/5 border-destructive/20"
              onRemind={handleRemind}
              onView={id => navigate(`/admin/members/${id}`)}
            />
            <AlertRow
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Expiring within 30 days"
              members={membershipAlerts.warning}
              colorClass="text-amber-600 dark:text-amber-400"
              bgClass="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30"
              onRemind={handleRemind}
              onView={id => navigate(`/admin/members/${id}`)}
            />
            <AlertRow
              icon={<RefreshCw className="w-4 h-4" />}
              label="Expired — not renewed"
              members={membershipAlerts.expired}
              colorClass="text-muted-foreground"
              bgClass="bg-muted/40 border-border"
              onRemind={handleRemind}
              onView={id => navigate(`/admin/members/${id}`)}
            />
            <AlertRow
              icon={<BookOpen className="w-4 h-4" />}
              label="Low class credits (≤2 left)"
              members={membershipAlerts.lowCredits}
              colorClass="text-orange-600 dark:text-orange-400"
              bgClass="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30"
              onRemind={handleRemind}
              onView={id => navigate(`/admin/members/${id}`)}
            />
            {membershipAlerts.noPass.length > 0 && (
              <AlertRow
                icon={<UserX className="w-4 h-4" />}
                label="No active pass"
                members={membershipAlerts.noPass.slice(0, 5)}
                colorClass="text-muted-foreground"
                bgClass="bg-muted/20 border-border"
                onRemind={handleRemind}
                onView={id => navigate(`/admin/members/${id}`)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h2 className="font-medium text-foreground mb-4">Monthly Revenue</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {revenueData.map((_, i) => <Cell key={i} fill={MONTH_COLORS[i % MONTH_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-medium text-foreground mb-4">Class Mix</h2>
            <div className="space-y-3">
              {Object.entries(typeCounts).map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{type}</span>
                    <span className="font-medium text-foreground">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full',
                        type === 'Yoga' ? 'bg-yoga' : type === 'Pilates' ? 'bg-pilates' : 'bg-meditation')}
                      style={{ width: typeTotal ? `${(count / typeTotal) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Today's classes ───────────────────────────────────────────────────── */}
      {todaySessions.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-medium text-foreground mb-3">Today's Classes</h2>
            <div className="space-y-2">
              {todaySessions.map(s => {
                const course = getCourse(s.courseId);
                const coach = getUser(s.coachId);
                const booked = getBookingCount(s.id);
                if (!course) return null;
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => navigate('/admin/calendar')}>
                    <div className="flex items-center gap-3">
                      <CourseTypeBadge type={course.type} />
                      <div>
                        <div className="text-sm font-medium text-foreground">{course.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(s.datetime)}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.room}</span>
                          <span>{coach?.name}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{booked}/{course.capacity}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
