import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AppSidebar } from './AppSidebar';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { LogOut, User, Dumbbell, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '@/lib/types';

const ROLE_ICON: Record<UserRole, React.ReactNode> = {
  customer: <User className="w-3.5 h-3.5" />,
  coach: <Dumbbell className="w-3.5 h-3.5" />,
  admin: <LayoutDashboard className="w-3.5 h-3.5" />,
};

const ROLE_LABEL: Record<UserRole, string> = {
  customer: 'Customer',
  coach: 'Coach',
  admin: 'Admin',
};

export function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <AppShell />;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { state } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Header */}
      <header className="shrink-0 h-12 border-b border-border bg-card flex items-center justify-between px-5 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded border border-border flex items-center justify-center">
            <span className="text-foreground text-[10px] font-bold font-serif tracking-tight">Z</span>
          </div>
          <span className="text-sm font-semibold text-foreground hidden sm:block tracking-tight">{state.studio.name}</span>
        </div>

        {/* User info + logout */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded border border-border bg-background">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-semibold">
                {user.name[0]}
              </div>
              <span className="text-xs font-medium text-foreground hidden sm:block">{user.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground border-l border-border pl-2 ml-0.5">
                {ROLE_ICON[user.role]}
                <span className="hidden sm:inline">{ROLE_LABEL[user.role]}</span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground h-7 px-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1.5 text-xs">Logout</span>
            </Button>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
