import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Target, Flame, Droplets, Moon, Utensils, Dumbbell,
  TrendingDown, Save, Edit2, Plus, Minus, Scale,
  NotebookPen, ChevronRight, History,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

// ── constants ────────────────────────────────────────────────────────────────
const MEAL_PRESETS = [
  { label: 'Light snack', kcal: 150 },
  { label: 'Salad', kcal: 250 },
  { label: 'Meal', kcal: 500 },
  { label: 'Big meal', kcal: 800 },
];

const HISTORY_DAYS = 14; // how many past days to show

// ── helpers ───────────────────────────────────────────────────────────────────
function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500' };
  if (bmi < 25) return { label: 'Normal', color: 'text-emerald-500' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-500' };
  return { label: 'Obese', color: 'text-red-500' };
}

function todayKey(uid: string) {
  return `health-log-${uid}-${new Date().toDateString()}`;
}

interface DailyLog {
  water: number;       // glasses drank today
  caloriesIn: number;  // kcal eaten today
  sleep: number;       // hours slept last night (0.5 step)
}

function loadLog(uid: string): DailyLog {
  try {
    const raw = localStorage.getItem(todayKey(uid));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { water: 0, caloriesIn: 0, sleep: 0 };
}

function saveLog(uid: string, log: DailyLog) {
  try { localStorage.setItem(todayKey(uid), JSON.stringify(log)); } catch { /* ignore */ }
}

function dayKey(uid: string, daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `health-log-${uid}-${d.toDateString()}`;
}

function dayLabel(daysAgo: number) {
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yest.';
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

function loadHistory(uid: string, days: number): (DailyLog & { label: string; daysAgo: number })[] {
  return Array.from({ length: days }, (_, i) => {
    const k = dayKey(uid, days - 1 - i);
    try {
      const raw = localStorage.getItem(k);
      const log: DailyLog = raw ? JSON.parse(raw) : { water: 0, caloriesIn: 0, sleep: 0 };
      return { ...log, label: dayLabel(days - 1 - i), daysAgo: days - 1 - i };
    } catch {
      return { water: 0, caloriesIn: 0, sleep: 0, label: dayLabel(days - 1 - i), daysAgo: days - 1 - i };
    }
  });
}

function seedHistory(uid: string, waterGoal: number, calGoal: number, sleepGoal: number) {
  const flag = `health-seed-v1-${uid}`;
  if (localStorage.getItem(flag)) return;
  for (let i = 1; i <= HISTORY_DAYS; i++) {
    const k = dayKey(uid, i);
    if (!localStorage.getItem(k)) {
      const log: DailyLog = {
        water: Math.min(waterGoal + 2, Math.round(waterGoal * (0.55 + Math.random() * 0.6))),
        caloriesIn: Math.round(calGoal * (0.65 + Math.random() * 0.55)),
        sleep: Math.round((sleepGoal * (0.65 + Math.random() * 0.55)) * 2) / 2,
      };
      try { localStorage.setItem(k, JSON.stringify(log)); } catch { /* ignore */ }
    }
  }
  localStorage.setItem(flag, '1');
}

// ── shared card shell ─────────────────────────────────────────────────────────
function Section({ title, icon, children, action }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
          <h2 className="font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── stepper ───────────────────────────────────────────────────────────────────
function Stepper({ value, min = 0, max, step = 1, unit, onDec, onInc }: {
  value: number; min?: number; max?: number; step?: number; unit?: string;
  onDec: () => void; onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onDec} disabled={value <= min}
        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 transition-all">
        <Minus className="w-3 h-3" />
      </button>
      <span className="min-w-[56px] text-center text-sm font-bold text-foreground">
        {value}{unit ? ` ${unit}` : ''}
      </span>
      <button type="button" onClick={onInc} disabled={max !== undefined && value >= max}
        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 transition-all">
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = 'bg-primary' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="relative h-2 rounded-full bg-muted overflow-hidden mt-2">
      <div className={cn('h-full rounded-full transition-all duration-300', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────────
export default function HealthProfilePage() {
  const { state, dispatch, getUser } = useStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const customerId = user?.userId ?? '';
  const profile = getUser(customerId);

  // ── today's log (localStorage-backed) ────────────────────────────────────
  const [log, setLog] = useState<DailyLog>(() => loadLog(customerId));

  // ── history ───────────────────────────────────────────────────────────────
  const waterGoal = profile?.dailyWaterGoal ?? 8;
  const calGoal   = profile?.dailyCalorieGoal ?? 2000;
  const sleepGoal = profile?.sleepGoal ?? 8;

  useEffect(() => {
    seedHistory(customerId, waterGoal, calGoal, sleepGoal);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const [historyMetric, setHistoryMetric] = useState<'water' | 'caloriesIn' | 'sleep'>('water');
  const [historyData, setHistoryData] = useState(() => loadHistory(customerId, HISTORY_DAYS));

  const updateLog = (patch: Partial<DailyLog>) => {
    const next = { ...log, ...patch };
    setLog(next);
    saveLog(customerId, next);
    setHistoryData(loadHistory(customerId, HISTORY_DAYS));
  };

  // ── body metrics (always editable, own save) ─────────────────────────────
  const [body, setBody] = useState({
    height: String(profile?.height ?? ''),
    currentWeight: String(profile?.currentWeight ?? ''),
    targetWeight: String(profile?.targetWeight ?? ''),
    startWeight: String(profile?.startWeight ?? ''),
  });
  const setBodyField = (key: string, val: string) => setBody(p => ({ ...p, [key]: val }));
  const saveBodyMetrics = () => {
    if (!profile) return;
    dispatch({
      type: 'UPDATE_USER', payload: {
        ...profile,
        height: body.height ? Number(body.height) : profile.height,
        currentWeight: body.currentWeight ? Number(body.currentWeight) : profile.currentWeight,
        targetWeight: body.targetWeight ? Number(body.targetWeight) : profile.targetWeight,
        startWeight: body.startWeight ? Number(body.startWeight) : profile.startWeight,
      },
    });
    toast({ title: 'Body metrics saved' });
  };

  // ── goals / prefs edit state ───────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    weeklyGoalClasses: String(profile?.weeklyGoalClasses ?? '3'),
    dailyWaterGoal: String(profile?.dailyWaterGoal ?? '8'),
    sleepGoal: String(profile?.sleepGoal ?? '8'),
    dailyCalorieGoal: String(profile?.dailyCalorieGoal ?? '2000'),
    healthNotes: profile?.healthNotes ?? '',
  });

  const setField = (key: string, val: string) => setFields(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    if (!profile) return;
    dispatch({
      type: 'UPDATE_USER', payload: {
        ...profile,
        weeklyGoalClasses: Number(fields.weeklyGoalClasses) || 3,
        dailyWaterGoal: Number(fields.dailyWaterGoal) || 8,
        sleepGoal: Number(fields.sleepGoal) || 8,
        dailyCalorieGoal: Number(fields.dailyCalorieGoal) || 2000,
        healthNotes: fields.healthNotes,
      },
    });
    setEditing(false);
    toast({ title: 'Profile settings saved' });
  };

  // ── computed ──────────────────────────────────────────────────────────────
  const bmi = useMemo(() => {
    const h = Number(body.height);
    const w = Number(body.currentWeight);
    return (h && w) ? w / ((h / 100) ** 2) : null;
  }, [body.height, body.currentWeight]);

  const allBookings = state.bookings.filter(b => b.customerId === customerId);
  const attendedCount = allBookings.filter(b => b.status === 'attended').length;
  const totalCalories = allBookings.filter(b => b.status === 'attended').reduce((sum, b) => {
    const s = state.sessions.find(x => x.id === b.sessionId);
    const c = s ? state.courses.find(x => x.id === s.courseId) : undefined;
    return sum + (c?.calories ?? 0);
  }, 0);

  const startW = Number(body.startWeight) || (profile?.startWeight ?? 0);
  const curW = Number(body.currentWeight) || (profile?.currentWeight ?? 0);
  const goalW = Number(body.targetWeight) || (profile?.targetWeight ?? 0);
  const lostKg = startW && curW ? Math.max(0, startW - curW) : 0;
  const toGoKg = curW && goalW ? Math.max(0, curW - goalW) : 0;
  const fitPct = startW && goalW && startW > goalW
    ? Math.min(100, Math.round((lostKg / (startW - goalW)) * 100)) : 0;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Health Profile</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Track your body, nutrition & fitness today</p>
      </div>

      <div className="space-y-4">
        {/* ── TODAY'S LOG ─────────────────────────────────────────────── */}
        <Section title="Today's Log" icon={<NotebookPen className="w-4 h-4" />}
          action={<span className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>}>

          {/* Water */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Droplets className="w-3.5 h-3.5 text-blue-500" /> Water
              </div>
              <Stepper
                value={log.water}
                max={waterGoal + 4}
                unit="glasses"
                onDec={() => updateLog({ water: Math.max(0, log.water - 1) })}
                onInc={() => updateLog({ water: log.water + 1 })}
              />
            </div>
            {/* glass icons */}
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: Math.max(waterGoal, log.water) }).map((_, i) => (
                <button key={i} type="button"
                  onClick={() => updateLog({ water: i < log.water ? i : i + 1 })}
                  className="transition-all">
                  <Droplets className={cn('w-5 h-5 transition-colors',
                    i < log.water ? 'text-blue-500' : 'text-muted-foreground/30'
                  )} />
                </button>
              ))}
            </div>
            <ProgressBar value={log.water} max={waterGoal} color="bg-blue-400" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{log.water} / {waterGoal} glasses</span>
              {log.water >= waterGoal && <span className="text-blue-500 font-medium">Goal reached!</span>}
            </div>
          </div>

          {/* Calories */}
          <div className="mb-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Utensils className="w-3.5 h-3.5 text-orange-500" /> Calories eaten
              </div>
              <Stepper
                value={log.caloriesIn}
                step={50}
                unit="kcal"
                onDec={() => updateLog({ caloriesIn: Math.max(0, log.caloriesIn - 50) })}
                onInc={() => updateLog({ caloriesIn: log.caloriesIn + 50 })}
              />
            </div>
            {/* quick add presets */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {MEAL_PRESETS.map(p => (
                <button key={p.label} type="button"
                  onClick={() => updateLog({ caloriesIn: log.caloriesIn + p.kcal })}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground hover:border-orange-400/50 hover:text-orange-600 dark:hover:text-orange-400 transition-all flex items-center gap-1">
                  <Plus className="w-2.5 h-2.5" />{p.label} +{p.kcal}
                </button>
              ))}
            </div>
            <ProgressBar value={log.caloriesIn} max={calGoal} color="bg-orange-400" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{log.caloriesIn.toLocaleString()} / {calGoal.toLocaleString()} kcal</span>
              {log.caloriesIn > calGoal
                ? <span className="text-red-500 font-medium">+{(log.caloriesIn - calGoal).toLocaleString()} over goal</span>
                : <span className="text-muted-foreground">{(calGoal - log.caloriesIn).toLocaleString()} kcal remaining</span>
              }
            </div>
          </div>

          {/* Sleep */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Moon className="w-3.5 h-3.5 text-indigo-500" /> Sleep last night
              </div>
              <Stepper
                value={log.sleep}
                max={12}
                step={0.5}
                unit="hrs"
                onDec={() => updateLog({ sleep: Math.max(0, Math.round((log.sleep - 0.5) * 10) / 10) })}
                onInc={() => updateLog({ sleep: Math.min(12, Math.round((log.sleep + 0.5) * 10) / 10) })}
              />
            </div>
            <ProgressBar value={log.sleep} max={sleepGoal} color="bg-indigo-400" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{log.sleep} / {sleepGoal} hrs</span>
              {log.sleep > 0 && log.sleep < sleepGoal && (
                <span className="text-indigo-500">{(sleepGoal - log.sleep).toFixed(1)} hrs short</span>
              )}
              {log.sleep >= sleepGoal && log.sleep > 0 && (
                <span className="text-indigo-500 font-medium">Well rested!</span>
              )}
            </div>
          </div>
        </Section>

        {/* ── LOG HISTORY ─────────────────────────────────────────────── */}
        <Section title="Log History" icon={<History className="w-4 h-4" />}
          action={<span className="text-xs text-muted-foreground">Past 14 days</span>}>
          {/* metric tabs */}
          <div className="flex gap-1 bg-muted/60 rounded-xl p-1 mb-4">
            {([
              { key: 'water',      label: 'Water',    color: '#60a5fa' },
              { key: 'caloriesIn', label: 'Calories', color: '#fb923c' },
              { key: 'sleep',      label: 'Sleep',    color: '#818cf8' },
            ] as const).map(m => (
              <button key={m.key} type="button" onClick={() => setHistoryMetric(m.key)}
                className={cn('flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                  historyMetric === m.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}>
                {m.label}
              </button>
            ))}
          </div>

          {/* chart */}
          {(() => {
            const metaMap = {
              water:      { goal: waterGoal, unit: 'glasses', color: '#60a5fa', goalColor: '#3b82f6' },
              caloriesIn: { goal: calGoal,   unit: 'kcal',    color: '#fb923c', goalColor: '#f97316' },
              sleep:      { goal: sleepGoal, unit: 'hrs',     color: '#818cf8', goalColor: '#6366f1' },
            };
            const meta = metaMap[historyMetric];
            return (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyData} barCategoryGap="25%">
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={[0, Math.max(meta.goal * 1.3, 1)]} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        const val = d[historyMetric] as number;
                        return (
                          <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-md">
                            <div className="font-semibold text-foreground mb-0.5">{d.label}</div>
                            <div className="text-muted-foreground">
                              {val} / {meta.goal} {meta.unit}
                            </div>
                            <div className={cn('font-medium mt-0.5', val >= meta.goal ? 'text-emerald-500' : 'text-muted-foreground')}>
                              {val >= meta.goal ? 'Goal reached' : `${(meta.goal - val).toFixed(1)} short`}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine y={meta.goal} stroke={meta.goalColor} strokeDasharray="3 3" strokeOpacity={0.6} />
                    <Bar dataKey={historyMetric} radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {historyData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry[historyMetric] >= meta.goal
                            ? meta.goalColor
                            : entry.daysAgo === 0
                              ? meta.color
                              : `${meta.color}99`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

          {/* goal line legend */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <div className="w-5 border-t border-dashed border-muted-foreground/50" />
            <span>Daily goal</span>
            <span className="ml-auto text-[10px]">Darker = goal reached</span>
          </div>
        </Section>

        {/* ── FIT GOAL PROGRESS ──────────────────────────────────────── */}
        {(startW > 0 && goalW > 0 && curW > 0) && (
          <Section title="Fit Goal Progress" icon={<Target className="w-4 h-4" />}>
            <div className="flex items-end justify-between mb-3 text-[11px] text-muted-foreground">
              <span>Start<br /><span className="text-base font-bold text-foreground">{startW} kg</span></span>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-medium text-primary mb-0.5">NOW</span>
                <span className="text-xl font-extrabold text-foreground">{curW} kg</span>
              </div>
              <span className="text-right">Goal<br /><span className="text-base font-bold text-foreground">{goalW} kg</span></span>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden mb-1">
              <div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500" style={{ width: `${fitPct}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background shadow -translate-x-1/2 transition-all duration-500" style={{ left: `${fitPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-4">
              <span>{fitPct}% complete</span>
              <span>{toGoKg > 0 ? `${toGoKg} kg to go` : 'Goal reached!'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />, value: `-${lostKg.toFixed(1)} kg`, label: 'Lost', color: 'text-emerald-600 dark:text-emerald-400' },
                { icon: <Dumbbell className="w-3.5 h-3.5 text-primary" />, value: String(attendedCount), label: 'Classes', color: 'text-primary' },
                { icon: <Flame className="w-3.5 h-3.5 text-orange-500" />, value: `${(totalCalories / 1000).toFixed(1)}k`, label: 'kcal burned', color: 'text-orange-500' },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center gap-0.5 bg-muted/50 rounded-xl py-2.5">
                  {s.icon}
                  <span className={cn('text-sm font-bold', s.color)}>{s.value}</span>
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── BODY METRICS ───────────────────────────────────────────── */}
        <Section title="Body Metrics" icon={<Scale className="w-4 h-4" />}
          action={
            <Button size="sm" onClick={saveBodyMetrics} className="gap-1 h-7 text-xs px-3">
              <Save className="w-3 h-3" /> Save
            </Button>
          }>
          {([
            { label: 'Height', key: 'height', unit: 'cm' },
            { label: 'Current Weight', key: 'currentWeight', unit: 'kg' },
            { label: 'Goal Weight', key: 'targetWeight', unit: 'kg' },
            { label: 'Starting Weight', key: 'startWeight', unit: 'kg' },
          ] as const).map(row => (
            <div key={row.key} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={body[row.key]}
                  onChange={e => setBodyField(row.key, e.target.value)}
                  placeholder="—"
                  className="h-8 w-24 text-sm text-right font-semibold"
                />
                <span className="text-xs text-muted-foreground w-5">{row.unit}</span>
              </div>
            </div>
          ))}
          {bmi && (
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">BMI (calculated)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{bmi.toFixed(1)}</span>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full bg-muted', getBmiCategory(bmi).color)}>{getBmiCategory(bmi).label}</span>
              </div>
            </div>
          )}
        </Section>

        {/* ── DAILY GOAL SETTINGS ────────────────────────────────────── */}
        <Section title="Daily Goal Settings" icon={<ChevronRight className="w-4 h-4" />}
          action={
            editing ? (
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7 text-xs px-2.5">Discard</Button>
                <Button size="sm" onClick={handleSave} className="h-7 text-xs px-2.5 gap-1"><Save className="w-3 h-3" /> Save</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 text-xs px-2.5 gap-1">
                <Edit2 className="w-3 h-3" /> Edit
              </Button>
            )
          }>
          <p className="text-xs text-muted-foreground mb-3">These targets drive the progress bars in Today's Log.</p>
          {([
            { label: 'Daily calorie goal', key: 'dailyCalorieGoal', unit: 'kcal/day', display: profile?.dailyCalorieGoal ?? 2000 },
            { label: 'Daily water goal', key: 'dailyWaterGoal', unit: 'glasses/day', display: profile?.dailyWaterGoal ?? 8 },
            { label: 'Sleep goal', key: 'sleepGoal', unit: 'hrs/night', display: profile?.sleepGoal ?? 8 },
            { label: 'Weekly class goal', key: 'weeklyGoalClasses', unit: 'classes/week', display: profile?.weeklyGoalClasses ?? 3 },
          ] as const).map(row => (
            <div key={row.key} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <Input type="number" value={fields[row.key]} onChange={e => setField(row.key, e.target.value)}
                    className="h-7 w-20 text-sm text-right" />
                  <span className="text-xs text-muted-foreground text-right w-20">{row.unit}</span>
                </div>
              ) : (
                <span className="text-sm font-semibold text-foreground">{row.display} <span className="text-xs font-normal text-muted-foreground">{row.unit}</span></span>
              )}
            </div>
          ))}
        </Section>

        {/* ── HEALTH NOTES ───────────────────────────────────────────── */}
        <Section title="Health Notes" icon={<NotebookPen className="w-4 h-4" />}
          action={
            <Button size="sm" variant="outline" onClick={() => {
              if (!profile) return;
              dispatch({ type: 'UPDATE_USER', payload: { ...profile, healthNotes: fields.healthNotes } });
              toast({ title: 'Notes saved' });
            }} className="h-7 text-xs px-3 gap-1">
              <Save className="w-3 h-3" /> Save Notes
            </Button>
          }>
          <Textarea
            placeholder="Share injuries, health conditions, or goals with your instructors…"
            rows={4}
            value={fields.healthNotes}
            onChange={e => setField('healthNotes', e.target.value)}
            className="resize-none text-sm"
          />
        </Section>
      </div>
    </div>
  );
}
