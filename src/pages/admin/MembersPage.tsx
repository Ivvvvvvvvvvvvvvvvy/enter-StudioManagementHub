import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CardTypeBadge, formatDate } from '@/components/shared/badges';
import { Search, User, ChevronRight, Bell, AlertCircle, AlertTriangle, RefreshCw, UserX, CreditCard, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { MembershipCard } from '@/lib/types';
import { useOpenConversation } from '@/hooks/useOpenConversation';
import { avatarStyle } from '@/lib/avatar';

// ── Helpers ──────────────────────────────────────────────────────────────────

type MemberFilter = 'all' | 'critical' | 'warning' | 'expired' | 'low-credits' | 'none';

function getMemberStatus(card: MembershipCard | undefined) {
  if (!card) return 'none';
  const daysLeft = Math.ceil((new Date(card.expiry).getTime() - Date.now()) / 86400000);
  if (daysLeft <= 0) return 'expired';
  if (daysLeft <= 7) return 'critical';
  if (daysLeft <= 30) return 'warning';
  if (card.totalSessions !== null && (card.totalSessions - card.usedSessions) <= 2) return 'low-credits';
  return 'active';
}

function getDaysLeft(expiry: string) {
  return Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
}

const STATUS_CONFIG = {
  active:        { label: 'Active',         dot: 'bg-primary',    text: 'text-primary',    badge: 'bg-primary/10 text-primary border-primary/20' },
  warning:       { label: 'Expiring soon',  dot: 'bg-amber-500',  text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700' },
  critical:      { label: 'Urgent',         dot: 'bg-destructive', text: 'text-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/20' },
  expired:       { label: 'Expired',        dot: 'bg-muted-foreground', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground border-border' },
  'low-credits': { label: 'Low credits',    dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-700' },
  none:          { label: 'No pass',        dot: 'bg-border',     text: 'text-muted-foreground', badge: 'bg-muted/50 text-muted-foreground border-border' },
};

const FILTER_TABS: { key: MemberFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'all',          label: 'All',            icon: <User className="w-3.5 h-3.5" /> },
  { key: 'critical',     label: 'Urgent (≤7d)',   icon: <AlertCircle className="w-3.5 h-3.5" /> },
  { key: 'warning',      label: 'Expiring (≤30d)',icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { key: 'expired',      label: 'Lapsed',         icon: <RefreshCw className="w-3.5 h-3.5" /> },
  { key: 'low-credits',  label: 'Low credits',    icon: <CreditCard className="w-3.5 h-3.5" /> },
  { key: 'none',         label: 'No pass',        icon: <UserX className="w-3.5 h-3.5" /> },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminMembersPage() {
  const { state, getCustomerCards, getCustomerBookings } = useStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const openConversation = useOpenConversation('/admin/messages');
  const adminId = state.users.find(u => u.role === 'admin')?.id ?? '';

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<MemberFilter>('all');

  const customers = state.users.filter(u => u.role === 'customer');

  // Enrich customers with membership status
  const enriched = useMemo(() => {
    return customers.map(customer => {
      const cards = getCustomerCards(customer.id);
      const activeCard = cards.find(c => c.isActive);
      const latestCard = [...cards].sort((a, b) => new Date(b.expiry).getTime() - new Date(a.expiry).getTime())[0];
      const status = getMemberStatus(activeCard) as keyof typeof STATUS_CONFIG;
      const bookings = getCustomerBookings(customer.id);
      const upcomingCount = bookings.filter(b => b.status === 'confirmed').length;
      const daysLeft = activeCard ? getDaysLeft(activeCard.expiry) : null;
      const creditsLeft = activeCard?.totalSessions != null ? activeCard.totalSessions - activeCard.usedSessions : null;
      return { customer, activeCard, latestCard, status, upcomingCount, daysLeft, creditsLeft };
    });
  }, [customers, state.cards, state.bookings, getCustomerCards, getCustomerBookings]);

  // Tab counts
  const counts = useMemo(() => {
    const c: Partial<Record<MemberFilter, number>> = { all: enriched.length };
    enriched.forEach(e => {
      c[e.status as MemberFilter] = (c[e.status as MemberFilter] ?? 0) + 1;
    });
    return c;
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter(e => {
      const matchesFilter = activeFilter === 'all' || e.status === activeFilter;
      const matchesSearch = !search ||
        e.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        e.customer.phone.includes(search);
      return matchesFilter && matchesSearch;
    }).sort((a, b) => {
      // Sort urgency first within filter
      const urgency: Record<string, number> = { critical: 0, warning: 1, expired: 2, 'low-credits': 3, none: 4, active: 5 };
      return (urgency[a.status] ?? 9) - (urgency[b.status] ?? 9);
    });
  }, [enriched, activeFilter, search]);

  const handleRemind = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({ title: `Reminder sent to ${name}`, description: 'A renewal reminder has been queued.' });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-semibold text-foreground mb-0.5">Members</h1>
        <p className="text-muted-foreground text-sm">Manage member profiles and membership health</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        {FILTER_TABS.map(tab => {
          const count = counts[tab.key] ?? 0;
          if (tab.key !== 'all' && count === 0) return null;
          const isActive = activeFilter === tab.key;
          const isUrgent = tab.key === 'critical' && count > 0;
          return (
            <button key={tab.key} type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                isActive
                  ? 'bg-foreground text-background border-foreground'
                  : isUrgent
                    ? 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              )}>
              {tab.icon}
              {tab.label}
              {count > 0 && <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                isActive ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground')}>
                {count}
              </span>}
            </button>
          );
        })}
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {filtered.map(({ customer, activeCard, status, upcomingCount, daysLeft, creditsLeft }) => {
          const cfg = STATUS_CONFIG[status];
          const showRemind = status === 'critical' || status === 'warning' || status === 'expired' || status === 'low-credits';

          // Status label text
          let statusText = '';
          if (status === 'active' && daysLeft !== null) statusText = `${daysLeft}d remaining`;
          else if (status === 'critical' && daysLeft !== null) statusText = `Expires in ${daysLeft}d!`;
          else if (status === 'warning' && daysLeft !== null) statusText = `Expires ${formatDate(activeCard!.expiry)}`;
          else if (status === 'expired') statusText = `Expired ${Math.abs(daysLeft ?? 0)}d ago`;
          else if (status === 'low-credits') statusText = `${creditsLeft} class${creditsLeft !== 1 ? 'es' : ''} left`;
          else if (status === 'none') statusText = 'No active pass';

          return (
            <div key={customer.id}
              className={cn(
                'flex items-center gap-3 p-4 rounded-xl border bg-card cursor-pointer hover:shadow-sm transition-all',
                status === 'critical' ? 'border-destructive/30 hover:border-destructive/50' :
                status === 'warning' ? 'border-amber-200 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700' :
                'border-border hover:border-border'
              )}
              onClick={() => navigate(`/admin/members/${customer.id}`)}>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center font-semibold text-sm"
                style={!customer.avatar ? avatarStyle(customer.id) : undefined}>
                {customer.avatar
                  ? <img src={customer.avatar} alt={customer.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                  : customer.name[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{customer.name}</span>
                  {activeCard && <CardTypeBadge type={activeCard.type} />}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  <span>{customer.phone}</span>
                  <span>Joined {formatDate(customer.joinDate)}</span>
                  {upcomingCount > 0 && <span className="text-primary">{upcomingCount} upcoming</span>}
                </div>
              </div>

              {/* Status badge */}
              <div className="shrink-0 flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <div className={cn('flex items-center gap-1.5 text-xs font-medium', cfg.text)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                    {statusText}
                  </div>
                </div>

                {showRemind && (
                  <Button variant="outline" size="sm"
                    className="h-7 px-2 text-xs gap-1 hidden sm:flex"
                    onClick={e => handleRemind(customer.name, e)}>
                    <Bell className="w-3 h-3" /> Remind
                  </Button>
                )}

                <button
                  type="button"
                  title="Send message"
                  onClick={e => { e.stopPropagation(); openConversation(customer.id, adminId, 'admin'); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>

                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No members found{search ? ` for "${search}"` : ''}.</p>
        </div>
      )}
    </div>
  );
}
