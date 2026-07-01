import React, { createContext, useContext, useState } from 'react';
import type { UserRole } from './types';

// ── Mock credentials ───────────────────────────────────────
export interface MockAccount {
  userId: string;
  phone: string;
  password: string;
  role: UserRole;
  name: string;
  hint?: string;
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  // Customers (4 accounts)
  { userId: 'cust-1', phone: '139-2001-0001', password: '123456', role: 'customer', name: 'Emily Zhang', hint: 'Monthly Pass · 2 upcoming bookings' },
  { userId: 'cust-2', phone: '139-2001-0002', password: '123456', role: 'customer', name: 'Jessica Li', hint: 'Session Pack · 1 upcoming booking' },
  { userId: 'cust-3', phone: '139-2001-0003', password: '123456', role: 'customer', name: 'Lily Liu', hint: 'Annual Pass · 1 upcoming booking' },
  { userId: 'cust-4', phone: '139-2001-0004', password: '123456', role: 'customer', name: 'Amy Wang', hint: 'Session Pack · 1 upcoming booking' },
  // Coaches (3 accounts)
  { userId: 'coach-1', phone: '138-1111-0001', password: '123456', role: 'coach', name: 'Sarah Chen', hint: 'Hatha · Vinyasa Flow' },
  { userId: 'coach-2', phone: '138-1111-0002', password: '123456', role: 'coach', name: 'Maya Zhao', hint: 'Apparatus · Mat Pilates' },
  { userId: 'coach-3', phone: '138-1111-0003', password: '123456', role: 'coach', name: 'Noah Wang', hint: 'Mindfulness · Breathwork' },
  // Admin
  { userId: 'admin-1', phone: '138-0000-0001', password: 'admin888', role: 'admin', name: 'Diana Lin', hint: 'Studio Administrator' },
];

// ── Auth state ─────────────────────────────────────────────
interface AuthState {
  user: MockAccount | null;
  login: (phone: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockAccount | null>(null);

  const login = (phone: string, password: string): boolean => {
    const matched = MOCK_ACCOUNTS.find(
      a => a.phone === phone.trim() && a.password === password
    );
    if (matched) {
      setUser(matched);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function roleHome(role: UserRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'coach') return '/coach';
  return '/';
}
