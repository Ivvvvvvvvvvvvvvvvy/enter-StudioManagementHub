import { useNavigate, useLocation } from 'react-router-dom';
import { User, Dumbbell, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

type RoleTab = 'customer' | 'coach' | 'admin';

const TABS: { key: RoleTab; label: string; icon: React.ReactNode; home: string }[] = [
  { key: 'customer', label: 'Customer', icon: <User className="w-4 h-4" />, home: '/' },
  { key: 'coach', label: 'Coach', icon: <Dumbbell className="w-4 h-4" />, home: '/coach' },
  { key: 'admin', label: 'Admin', icon: <LayoutDashboard className="w-4 h-4" />, home: '/admin' },
];

function detectRole(pathname: string): RoleTab {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/coach')) return 'coach';
  return 'customer';
}

export function RoleSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeRole = detectRole(location.pathname);

  return (
    <div className="flex items-center gap-1 bg-muted rounded-full p-1">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => navigate(tab.home)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
            activeRole === tab.key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
