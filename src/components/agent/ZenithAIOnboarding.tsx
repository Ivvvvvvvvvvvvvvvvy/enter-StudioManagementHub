import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles, Users, TrendingUp, CalendarClock, MessageSquareHeart,
  BarChart3, ArrowRight, ArrowLeft, X, Target, MessagesSquare, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'zenith-ai-onboarded';

export function hasSeenZenithAIOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

const CAPABILITIES = [
  {
    icon: Users,
    title: 'Customer Intelligence',
    desc: 'Segment active, dormant and high-value members with auto-generated profiles.',
  },
  {
    icon: MessageSquareHeart,
    title: 'Churn & Retention',
    desc: 'Spot members about to lapse and get ready-to-send win-back lists.',
  },
  {
    icon: TrendingUp,
    title: 'Revenue & Performance',
    desc: 'Ask about revenue, repeat rate, ARPU or fill rate — answered with trends.',
  },
  {
    icon: CalendarClock,
    title: 'Schedule Optimization',
    desc: 'Analyze demand by time slot and rebalance classes and coach rosters.',
  },
  {
    icon: BarChart3,
    title: 'Visual Charts',
    desc: 'Trends, breakdowns and KPIs turned into clean charts at a glance.',
  },
];

const EXAMPLES = [
  'Which members are about to churn? Build me a win-back list.',
  'Profile my high-value members and what they have in common.',
  'How is this month\u2019s revenue versus last year?',
  'Which classes should I add or cut based on fill rate?',
];

const STEPS = ['intro', 'skills', 'start'] as const;
type Step = typeof STEPS[number];

export function ZenithAIOnboarding({ onClose }: { onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const [step, setStep] = useState(0);

  const handleClose = () => {
    markSeen();
    setClosing(true);
    setTimeout(onClose, 180);
  };

  const next = () => {
    if (step >= STEPS.length - 1) handleClose();
    else setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const current: Step = STEPS[step];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-card-hover transition-all duration-200 ${closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-fade-in'}`}
      >
        {/* Hero header */}
        <div className="relative overflow-hidden px-7 pt-8 pb-7 gradient-hero">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary-foreground/10 blur-2xl" />
          <div className="absolute right-10 bottom-2 w-24 h-24 rounded-full bg-primary-foreground/10 blur-xl" />
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center border border-primary-foreground/20">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-primary-foreground/70">
                {current === 'intro' ? 'Welcome to' : current === 'skills' ? 'What it does' : 'Get started'}
              </div>
              <h2 className="text-2xl font-bold text-primary-foreground tracking-tight">
                Zenith AI
              </h2>
            </div>
          </div>
          <p className="relative mt-4 text-sm leading-relaxed text-primary-foreground/85 max-w-md">
            {current === 'intro'
              ? 'Your dedicated customer analyst for the studio. It turns members, bookings and revenue into clear insight \u2014 and tells you exactly who to focus on next.'
              : current === 'skills'
                ? 'Ask in plain English. Zenith AI reads your live studio data and answers with profiles, risk lists, trends and charts.'
                : 'Type a question, or start from one of these. You can always ask follow-ups in the same conversation.'}
          </p>
        </div>

        {/* Body */}
        <div className="px-7 py-6">
          {current === 'intro' && (
            <div className="space-y-3">
              {[
                { icon: Target, title: 'Built for customer analysis', desc: 'Who is active, who is slipping away, and who is worth the most \u2014 answered first.' },
                { icon: MessagesSquare, title: 'Just ask in natural language', desc: 'No dashboards to configure. Conversational questions, actionable answers.' },
                { icon: ShieldCheck, title: 'Grounded in your real data', desc: 'Every answer is based on your studio\u2019s live records, never made-up numbers.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3 rounded-xl border border-border bg-background p-3.5">
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{title}</div>
                    <div className="text-xs leading-relaxed text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {current === 'skills' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex gap-3 rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-primary/40"
                >
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{title}</div>
                    <div className="text-xs leading-relaxed text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {current === 'start' && (
            <div className="space-y-2">
              {EXAMPLES.map((ex) => (
                <div
                  key={ex}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-3"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm text-foreground leading-snug">{ex}</span>
                </div>
              ))}
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/60 px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Tip: results are AI-generated — verify against your data before major decisions.
                </span>
              </div>
            </div>
          )}

          {/* Footer: dots + nav */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={back} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <Button onClick={next} size="sm" className="gap-1.5">
                {step >= STEPS.length - 1 ? 'Start using' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
