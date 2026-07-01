import { NavLink } from 'react-router-dom';
import {
  Home, BookOpen, CalendarDays, ClipboardList, Users,
  CreditCard, BarChart3, Settings, UserCheck, RefreshCw, AlertCircle, MessageSquare, Heart, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function SideNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/' || item.to === '/coach' || item.to === '/admin'}
          className={({ isActive }) => cn(
            'flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-all duration-150',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
          {(item.badge ?? 0) > 0 && (
            <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

const CUSTOMER_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
  { to: '/courses', label: 'Browse Classes', icon: <BookOpen className="w-4 h-4" /> },
  { to: '/my-bookings', label: 'My Bookings', icon: <CalendarDays className="w-4 h-4" /> },
  { to: '/private', label: 'Private Sessions', icon: <UserCheck className="w-4 h-4" /> },
  { to: '/health-profile', label: 'Health Profile', icon: <Heart className="w-4 h-4" /> },
  { to: '/messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
  { to: '/renewal', label: 'Membership', icon: <RefreshCw className="w-4 h-4" /> },
];

const COACH_NAV: NavItem[] = [
  { to: '/coach', label: 'My Schedule', icon: <CalendarDays className="w-4 h-4" /> },
  { to: '/coach/private', label: 'Private Sessions', icon: <UserCheck className="w-4 h-4" /> },
  { to: '/messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
  { to: '/admin/ai-analyst', label: 'Zenith AI', icon: <Sparkles className="w-4 h-4" /> },
  { to: '/admin/courses', label: 'Classes', icon: <BookOpen className="w-4 h-4" /> },
  { to: '/admin/calendar', label: 'Calendar', icon: <CalendarDays className="w-4 h-4" /> },
  { to: '/admin/bookings', label: 'Bookings', icon: <ClipboardList className="w-4 h-4" /> },
  { to: '/admin/members', label: 'Members', icon: <Users className="w-4 h-4" /> },
  { to: '/admin/messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
  { to: '/admin/orders', label: 'Orders & Revenue', icon: <CreditCard className="w-4 h-4" /> },
  { to: '/admin/settings', label: 'Studio Settings', icon: <Settings className="w-4 h-4" /> },
];

const ROLE_LABEL: Record<string, string> = {
  customer: 'Customer View',
  coach: 'Coach View',
  admin: 'Admin View',
};

export function AppSidebar() {
  const { user } = useAuth();
  const { state, getCustomerCards, getUnreadCount } = useStore();

  const role = user?.role ?? 'customer';
  const userId = user?.userId ?? '';
  const unread = getUnreadCount(userId);

  const baseNav = role === 'admin' ? ADMIN_NAV : role === 'coach' ? COACH_NAV : CUSTOMER_NAV;
  const navItems = baseNav.map(item =>
    item.label === 'Messages' ? { ...item, badge: unread } : item
  );

  // Membership status for customer sidebar
  const customerId = userId;
  const activeCard = role === 'customer'
    ? (getCustomerCards(customerId).find(c => c.isActive) ?? null)
    : null;
  const daysLeft = activeCard
    ? Math.max(0, Math.ceil((new Date(activeCard.expiry).getTime() - Date.now()) / 86400000))
    : 0;
  const cardLabel: Record<string, string> = { monthly: 'Monthly', sessions: 'Class Pack', annual: 'Annual' };

  return (
    <aside className="w-52 shrink-0 border-r border-border bg-card flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border">
        <div className="text-sm font-semibold text-foreground tracking-tight">
          {state.studio.name}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{state.studio.tagline}</div>
      </div>

      {/* Customer membership status strip */}
      {role === 'customer' && (
        <div className={cn(
          'px-4 py-2.5 border-b border-border text-xs',
          activeCard ? (daysLeft <= 7 ? 'bg-destructive/5' : 'bg-primary/5') : 'bg-muted/30'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Membership</span>
            {activeCard && daysLeft <= 7 && <AlertCircle className="w-3 h-3 text-destructive" />}
          </div>
          {activeCard ? (
            <div>
              <span className={cn('font-semibold', daysLeft <= 7 ? 'text-destructive' : 'text-primary')}>
                {cardLabel[activeCard.type] ?? 'Active'}
              </span>
              <span className="text-muted-foreground ml-1">· {daysLeft}d left</span>
            </div>
          ) : (
            <span className="text-muted-foreground">No active pass</span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <SideNav items={navItems} />
      </div>
      <div className="px-4 py-3 border-t border-border">
        <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">
          {ROLE_LABEL[role]}
        </div>
      </div>
    </aside>
  );
}
