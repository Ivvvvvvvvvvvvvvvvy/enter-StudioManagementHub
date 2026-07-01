import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, MOCK_ACCOUNTS, roleHome } from '@/lib/auth';
import type { MockAccount } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, ArrowRight, Eye, EyeOff, User, Dumbbell, LayoutDashboard, ArrowLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';
import { trackEvent } from '@enter-pro/analytics-sdk';

// ── Static data ────────────────────────────────────────────

const HERO_IMAGE = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&h=900&fit=crop&q=80';
const TICKER_ITEMS = [
  { type: 'stat' as const, value: '500+', label: 'Active Members' },
  { type: 'tag'  as const, text: 'Yoga · Flow' },
  { type: 'stat' as const, value: '20+',  label: 'Expert Coaches' },
  { type: 'tag'  as const, text: 'Pilates · Reformer' },
  { type: 'stat' as const, value: '50+',  label: 'Weekly Classes' },
  { type: 'tag'  as const, text: 'Strength Training' },
  { type: 'stat' as const, value: '5',    label: 'Years of Excellence' },
  { type: 'tag'  as const, text: 'Mindfulness & Meditation' },
  { type: 'stat' as const, value: '98%',  label: 'Member Satisfaction' },
  { type: 'tag'  as const, text: 'Private Sessions Available' },
  { type: 'stat' as const, value: '4.9',  label: 'Studio Rating' },
  { type: 'tag'  as const, text: 'Book Your Class Today' },
];
const ROLE_DATA = [{
  role: 'customer' as UserRole,
  badge: 'Member',
  icon: <User className="w-4 h-4" />,
  title: 'Member Portal',
  desc: 'Book classes, track your progress, and manage your membership — all in one place.',
  features: ['Class booking & cancellation', 'Membership renewal & history', 'Private session scheduling'],
  cta: 'Enter as Member',
  image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=700&h=460&fit=crop&q=80',
  accent: '#14b8a6'
}, {
  role: 'coach' as UserRole,
  badge: 'Coach',
  icon: <Dumbbell className="w-4 h-4" />,
  title: 'Coach Dashboard',
  desc: 'Manage your schedule, track attendance, and coordinate private lessons efficiently.',
  features: ['Daily & weekly schedule view', 'Booking & attendance tracking', 'Private lesson management'],
  cta: 'Enter as Coach',
  image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=700&h=460&fit=crop&q=80',
  accent: '#14b8a6'
}, {
  role: 'admin' as UserRole,
  badge: 'Admin',
  icon: <LayoutDashboard className="w-4 h-4" />,
  title: 'Admin Console',
  desc: 'Full studio operations — classes, members, coaches, revenue analytics, and settings.',
  features: ['Member & order management', 'Class schedule & calendar', 'Revenue analytics & reports'],
  cta: 'Enter as Admin',
  image: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=700&h=460&fit=crop&q=80',
  accent: '#14b8a6'
}] as const;
type RoleData = typeof ROLE_DATA[number];

// ── Logo ───────────────────────────────────────────────────

function ZenithLogo({
  size = 28
}: {
  size?: number;
}) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer square frame */}
      <rect x="1.5" y="1.5" width="25" height="25" rx="5" stroke="white" strokeWidth="1.5" strokeOpacity="0.25" />
      {/* Z mark — top bar teal, diagonal + bottom bar white */}
      <path d="M7 9H21L7 19H21" stroke="white" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter" />
      <line x1="7" y1="9" x2="21" y2="9" stroke="#14b8a6" strokeWidth="2.2" strokeLinecap="square" />
    </svg>;
}

// ── Role card ──────────────────────────────────────────────

function RoleCard({
  data,
  onSelect
}: {
  data: RoleData;
  onSelect: () => void;
}) {
  return <div className="group relative overflow-hidden rounded-2xl cursor-pointer flex flex-col border border-white/8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-white/15" style={{ background: '#171717' }} onClick={onSelect}>
      {/* Photo */}
      <div className="relative h-52 overflow-hidden">
        <img src={data.image} alt={data.title} crossOrigin="anonymous" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* Accent color tint at top */}
        <div className="absolute inset-0 opacity-30" style={{
        background: `linear-gradient(135deg, ${data.accent}55 0%, transparent 60%)`
      }} />

        {/* Badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold tracking-wide border border-white/20 backdrop-blur-sm" style={{
          background: `${data.accent}30`
        }}>
            {data.icon} {data.badge}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <h2 className="text-white text-lg font-bold mb-2">{data.title}</h2>
        <p className="text-neutral-400 text-sm leading-relaxed mb-4">{data.desc}</p>

        <div className="flex-1" />
        <div className="space-y-1.5 mb-5">
          {data.features.map(f => <div key={f} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{
            background: data.accent
          }} />
              <span className="text-neutral-500 text-xs">{f}</span>
            </div>)}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/8">
          <span className="text-white text-sm font-semibold">{data.cta}</span>
          <div className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1" style={{
          background: data.accent
        }}>
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </div>;
}

// ── Login step ─────────────────────────────────────────────

function LoginStep({
  roleData,
  onBack
}: {
  roleData: RoleData;
  onBack: () => void;
}) {
  const {
    login
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const accounts = MOCK_ACCOUNTS.filter(a => a.role === roleData.role);
  const fill = (a: MockAccount) => {
    setPhone(a.phone);
    setPassword(a.password);
    setSelected(a.userId);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) {
      toast({
        title: 'Please enter phone and password',
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const ok = login(phone, password);
      setLoading(false);
      if (ok) {
        const account = MOCK_ACCOUNTS.find(a => a.phone === phone.trim());
        if (account) {
          trackEvent('login_completed', { eventType: 'conversion', properties: { role: account.role } });
          navigate(roleHome(account.role));
        }
      } else {
        toast({
          title: 'Invalid credentials',
          description: 'Check the demo accounts below',
          variant: 'destructive'
        });
      }
    }, 350);
  };
  return <div className="min-h-screen flex" style={{ background: '#0a0a0a' }}>

      {/* Left: full-height gym photo panel */}
      <div className="hidden lg:flex relative w-[45%] flex-col overflow-hidden">
        <img src={roleData.image} alt={roleData.title} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-transparent" />
        <div className="absolute inset-0 opacity-20" style={{
        background: `radial-gradient(ellipse at top left, ${roleData.accent}, transparent 60%)`
      }} />

        {/* Back */}
        <div className="relative z-10 p-7">
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> All portals
          </button>
        </div>

        {/* Bottom info */}
        <div className="relative z-10 mt-auto p-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 text-white text-xs font-bold mb-5 tracking-wide backdrop-blur-sm" style={{
          background: `${roleData.accent}25`
        }}>
            {roleData.icon} {roleData.badge}
          </span>
          <h2 className="text-white text-4xl font-black mb-3 leading-tight uppercase">{roleData.title}</h2>
          <p className="text-white/60 text-sm leading-relaxed mb-6">{roleData.desc}</p>
          <div className="space-y-2.5">
            {roleData.features.map(f => <div key={f} className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" style={{
              color: roleData.accent
            }} />
                <span className="text-white/70 text-sm">{f}</span>
              </div>)}
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 overflow-y-auto" style={{ background: '#0a0a0a' }}>
        <div className="w-full max-w-sm">

          {/* Mobile back */}
          <button type="button" onClick={onBack} className="lg:hidden flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <ZenithLogo size={26} />
            <span className="font-serif text-base font-semibold text-white/60 tracking-tight">Zenith Studio</span>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-6" style={{
              background: roleData.accent
            }} />
              <span className="text-xs font-bold tracking-[0.15em] uppercase" style={{
              color: roleData.accent
            }}>
                {roleData.badge} Login
              </span>
            </div>
            <h2 className="text-white text-3xl font-black leading-tight mb-2">Welcome back</h2>
            <p className="text-neutral-500 text-sm">Sign in to your {roleData.badge.toLowerCase()} account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Phone Number</label>
              <Input value={phone} onChange={e => {
              setPhone(e.target.value);
              setSelected(null);
            }} placeholder="e.g. 139-2001-0001" className="h-12 bg-white/5 border-white/10 text-white placeholder:text-neutral-700 focus-visible:ring-0 focus-visible:border-white/30 rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Password</label>
              <div className="relative">
                <Input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-12 pr-10 bg-white/5 border-white/10 text-white placeholder:text-neutral-700 focus-visible:ring-0 focus-visible:border-white/30 rounded-xl" />
                <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 font-black text-sm tracking-widest rounded-xl border-none text-white" style={{
            background: roleData.accent
          }} disabled={loading}>
              {loading ? <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span> : <span className="flex items-center gap-2">
                  SIGN IN <ArrowRight className="w-4 h-4" />
                </span>}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden" style={{
          background: 'rgba(255,255,255,0.03)'
        }}>
            <div className="px-4 py-2.5 border-b border-white/8">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-600">Demo accounts — click to fill</span>
            </div>
            <div className="p-2 space-y-1">
              {accounts.map(a => <button key={a.userId} type="button" onClick={() => fill(a)} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all', selected === a.userId ? 'bg-white/10 border border-white/15' : 'hover:bg-white/5 border border-transparent')}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{
                background: `${roleData.accent}25`,
                color: roleData.accent
              }}>
                    {a.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{a.name}</div>
                    <div className="text-xs text-neutral-600 truncate">{a.hint}</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                </button>)}
            </div>
          </div>
        </div>
      </div>
    </div>;
}

// ── Main page ──────────────────────────────────────────────

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
  if (selectedRole) {
    return <LoginStep roleData={selectedRole} onBack={() => setSelectedRole(null)} />;
  }
  return <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* ── Hero ── */}
      <div className="relative h-[58vh] min-h-[420px] overflow-hidden">
        <img src={HERO_IMAGE} alt="Gym" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover object-center" />
        {/* Layered overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent" />

        {/* Nav */}
        <div className="relative z-10 flex items-center justify-between px-8 md:px-14 py-7">
          <div className="flex items-center gap-2.5">
            <ZenithLogo size={28} />
            <span className="font-serif text-base font-bold text-white tracking-tight">Zenith Studio</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            {['Yoga', 'Pilates', 'Strength', 'Mindfulness'].map(t => {})}
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 flex flex-col justify-center px-8 md:px-14 pb-16" style={{
        height: 'calc(100% - 88px)'
      }}>
          <div className="max-w-xl">
            <h1 className="text-white font-black leading-none tracking-tight uppercase mb-6" style={{
            fontSize: 'clamp(3rem, 7vw, 5.5rem)',
            lineHeight: '0.92'
          }}>
              TRAIN<br />
              <span style={{
              color: '#14b8a6'
            }}>SMARTER.</span><br />
              PERFORM<br />
              BETTER.
            </h1>
            <p className="text-white/40 text-base leading-relaxed max-w-sm">
              The all-in-one platform for studio members, coaches, and administrators.
            </p>
          </div>
        </div>
      </div>

      {/* ── Ticker bar ── */}
      <div className="border-y border-white/5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <style>{`
          @keyframes zenith-ticker {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          .zenith-ticker-track {
            display: flex;
            width: max-content;
            animation: zenith-ticker 32s linear infinite;
          }
          .zenith-ticker-track:hover {
            animation-play-state: paused;
          }
          /* ticker ready */
        `}</style>
        <div className="zenith-ticker-track py-4">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className="flex items-center shrink-0">
              {item.type === 'stat' ? (
                <div className="flex items-baseline gap-1.5 px-8">
                  <span className="text-xl font-black text-white leading-none">{item.value}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 whitespace-nowrap">{item.label}</span>
                </div>
              ) : (
                <div className="px-8">
                  <span className="text-xs font-medium text-neutral-600 tracking-wide whitespace-nowrap">{item.text}</span>
                </div>
              )}
              {/* Separator */}
              <span className="text-neutral-800 text-xs select-none">◆</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Role cards ── */}
      <div className="flex-1 flex flex-col items-center px-6 py-12" style={{ background: '#0a0a0a' }}>
        <div className="text-center mb-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-600 mb-3">
            Select Your Portal
          </p>
          <h2 className="text-white text-2xl font-bold">How would you like to sign in?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl items-stretch">
          {ROLE_DATA.map(data => <RoleCard key={data.role} data={data} onSelect={() => {
            trackEvent('role_portal_selected', { eventType: 'custom', properties: { role: data.role } });
            setSelectedRole(data);
          }} />)}
        </div>

        <p className="mt-10 text-xs text-neutral-800">© 2026 Zenith Studio · All rights reserved</p>
      </div>
    </div>;
}