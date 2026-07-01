import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '@enter-pro/analytics-sdk';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { WeekCalendar, type WeekSlotItem } from '@/components/shared/WeekCalendar';
import { formatDate, formatTime, formatCurrency } from '@/components/shared/badges';
import { Clock, CheckCircle2, X, MessageSquare, BookOpen, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { User as UserType, PrivateLessonStatus } from '@/lib/types';
import { useOpenConversation } from '@/hooks/useOpenConversation';
import { avatarStyle } from '@/lib/avatar';

// ── Booking form helpers ──────────────────────────────────────────────────────
const TIME_SLOTS = ['9:00 AM', '10:30 AM', '2:00 PM', '3:30 PM', '6:00 PM', '7:30 PM'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function getNextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1); return d;
  });
}
const DAYS = getNextDays(7);
function slotToDatetime(day: Date, slot: string): string {
  const d = new Date(day);
  const ampm = slot.includes('PM') ? 'pm' : 'am';
  const [hStr, mStr] = slot.replace(/ (AM|PM)/, '').split(':');
  let h = parseInt(hStr);
  if (ampm === 'pm' && h !== 12) h += 12;
  d.setHours(h, parseInt(mStr), 0, 0);
  return d.toISOString();
}

// ── Status styling ────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<PrivateLessonStatus, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/30',
  confirmed: 'bg-primary/8 text-primary border-primary/25',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-muted text-muted-foreground border-border',
};
const STATUS_LABEL: Record<PrivateLessonStatus, string> = {
  pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled',
};
// ── Coach card ────────────────────────────────────────────────────────────────
function CoachCard({ coach, onBook }: { coach: UserType; onBook: (c: UserType) => void }) {
  const navigate = useNavigate();
  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div
            className={cn('w-14 h-14 rounded-full shrink-0 overflow-hidden border-2 border-border cursor-pointer hover:border-primary/50 transition-colors',
              !coach.avatar && 'flex items-center justify-center font-semibold text-xl')}
            style={!coach.avatar ? avatarStyle(coach.id) : undefined}
            onClick={() => navigate(`/coaches/${coach.id}`)}>
            {coach.avatar ? (
              <img src={coach.avatar} alt={coach.name} crossOrigin="anonymous" className="w-full h-full object-cover object-top" />
            ) : coach.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button className="font-serif font-semibold text-lg text-foreground hover:text-primary transition-colors"
                onClick={() => navigate(`/coaches/${coach.id}`)}>
                {coach.name}
              </button>
              <Badge variant="secondary" className="text-xs">Instructor</Badge>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(coach.specialties ?? []).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">{coach.bio}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">60 min</span>
            <span className="text-sm font-bold text-primary ml-1">
              {coach.privateLessonPrice ? formatCurrency(coach.privateLessonPrice) : 'TBD'}
            </span>
          </div>
          <Button size="sm" onClick={() => onBook(coach)}>Book Session</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PrivateLessonsPage() {
  const { coaches, dispatch, getCoachPrivateLessons, getCustomerPrivateLessons, getUser } = useStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const openConversation = useOpenConversation('/messages');
  const customerId = user?.userId ?? '';

  const [tab, setTab] = useState<'browse' | 'my'>('browse');

  // ── Browse tab state ─────────────────────────────────────────────────────────
  const [bookingCoach, setBookingCoach] = useState<UserType | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(DAYS[0]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  const openDialog = (coach: UserType) => {
    setBookingCoach(coach); setSelectedDay(DAYS[0]); setSelectedSlot(''); setNotes(''); setDone(false);
  };
  const isSlotTaken = (slot: string) => {
    if (!bookingCoach) return false;
    const dt = slotToDatetime(selectedDay, slot);
    return getCoachPrivateLessons(bookingCoach.id).some(pl =>
      pl.status !== 'cancelled' &&
      Math.abs(new Date(pl.datetime).getTime() - new Date(dt).getTime()) < 60 * 60 * 1000
    );
  };
  const handleConfirm = () => {
    if (!bookingCoach || !selectedSlot) return;
    dispatch({ type: 'ADD_PRIVATE_LESSON', payload: { id: `pl-new-${Date.now()}`, customerId, coachId: bookingCoach.id, datetime: slotToDatetime(selectedDay, selectedSlot), duration: 60, status: 'pending', notes, price: bookingCoach.privateLessonPrice ?? 0, createdAt: new Date().toISOString() } });
    dispatch({ type: 'ADD_ORDER', payload: { id: `ord-pl-${Date.now()}`, customerId, type: 'private_lesson', amount: bookingCoach.privateLessonPrice ?? 0, status: 'pending', description: `Private Session – ${bookingCoach.name}`, createdAt: new Date().toISOString() } });
    trackEvent('private_lesson_requested', { eventType: 'conversion', properties: { coach_id: bookingCoach.id, duration: 60, price: bookingCoach.privateLessonPrice ?? 0 } });
    setDone(true);
    toast({ title: 'Request submitted', description: 'Awaiting instructor confirmation' });
  };

  // ── My Sessions tab state ─────────────────────────────────────────────────────
  const [showAll, setShowAll] = useState(true);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const lessons = getCustomerPrivateLessons(customerId);

  const handleCancelLesson = (id: string) => {
    dispatch({ type: 'UPDATE_PRIVATE_LESSON_STATUS', payload: { id, status: 'cancelled' } });
    toast({ title: 'Session cancelled' });
    setConfirmCancelId(null);
  };

  const items = useMemo<WeekSlotItem[]>(() => {
    return lessons
      .filter(pl => showAll ? pl.status !== 'cancelled' : (pl.status === 'pending' || pl.status === 'confirmed'))
      .map(pl => {
        const coach = getUser(pl.coachId);
        const isUpcoming = new Date(pl.datetime) > new Date();
        return {
          id: pl.id,
          datetime: pl.datetime,
          label: coach?.name ?? 'Instructor',
          sublabel: `${formatTime(pl.datetime)} · ${pl.duration} min`,
          colorClass: STATUS_COLOR[pl.status],
          dimmed: !isUpcoming || pl.status === 'cancelled' || pl.status === 'completed',
        } satisfies WeekSlotItem;
      });
  }, [lessons, showAll, getUser]);

  const mySessionsInitialWeek = useMemo(() => {
    const datetimes = lessons.map(pl => pl.datetime);
    if (!datetimes.length) return undefined;
    const now = new Date();
    const past = datetimes.filter(dt => new Date(dt) <= now).sort().reverse();
    const future = datetimes.filter(dt => new Date(dt) > now).sort();
    const anchor = past[0] ?? future[0];
    return anchor ? new Date(anchor) : undefined;
  }, [lessons]);

  // ── Tab bar ───────────────────────────────────────────────────────────────────
  const TabBar = (
    <div className="flex gap-1 bg-muted/60 rounded-xl p-1 mb-6 w-fit">
      {([['browse', BookOpen, 'Browse Coaches'], ['my', CalendarDays, 'My Sessions']] as const).map(([key, Icon, label]) => (
        <button key={key} type="button" onClick={() => setTab(key)}
          className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
            tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}>
          <Icon className="w-3.5 h-3.5" />
          {label}
          {key === 'my' && lessons.filter(pl => pl.status === 'pending' || pl.status === 'confirmed').length > 0 && (
            <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
              {lessons.filter(pl => pl.status === 'pending' || pl.status === 'confirmed').length}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-serif text-2xl font-semibold text-foreground mb-1">Private Sessions</h1>
      <p className="text-muted-foreground text-sm mb-5">One-on-one sessions with our expert instructors</p>

      {TabBar}

      {/* Browse Tab */}
      {tab === 'browse' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coaches.map((coach) => (
            <CoachCard key={coach.id} coach={coach} onBook={openDialog} />
          ))}
        </div>
      )}

      {/* My Sessions Tab */}
      {tab === 'my' && (
        <WeekCalendar
          title=""
          items={items}
          initialWeek={mySessionsInitialWeek}
          toolbar={
            <button type="button" onClick={() => setShowAll(v => !v)}
              className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                showAll ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:border-primary/30'
              )}>
              {showAll ? 'All history' : 'Upcoming only'}
            </button>
          }
          renderPopover={(item, onClose) => {
            const lesson = lessons.find(pl => pl.id === item.id);
            if (!lesson) return null;
            const coach = getUser(lesson.coachId);
            const isUpcoming = new Date(lesson.datetime) > new Date();
            const canCancel = isUpcoming && (lesson.status === 'pending' || lesson.status === 'confirmed');
            const isCancelling = confirmCancelId === item.id;
            return (
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold text-xs">{coach?.name ?? 'Instructor'}</div>
                  <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 ml-1"><X className="w-3 h-3" /></button>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5 mb-2.5">
                  <div>{formatDate(lesson.datetime)} · {formatTime(lesson.datetime)}</div>
                  <div>{lesson.duration} min</div>
                  <div className="font-semibold text-primary">{formatCurrency(lesson.price)}</div>
                </div>
                <span className={cn('inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium mb-2.5', STATUS_COLOR[lesson.status])}>
                  {STATUS_LABEL[lesson.status]}
                </span>
                {lesson.notes && <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-1 mb-2.5 line-clamp-2">{lesson.notes}</p>}
                {coach && (
                  <button type="button" onClick={() => { openConversation(customerId, coach.id, 'coach'); onClose(); }}
                    className="mb-2.5 w-full flex items-center justify-center gap-1 text-[10px] py-1.5 rounded border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                    <MessageSquare className="w-2.5 h-2.5" /> Message {coach.name.split(' ')[0]}
                  </button>
                )}
                {canCancel && (isCancelling ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground">Cancel this session?</p>
                    <div className="flex gap-1.5">
                      <button type="button" className="flex-1 text-[10px] py-1 rounded border border-border hover:bg-muted" onClick={() => setConfirmCancelId(null)}>Keep</button>
                      <button type="button" className="flex-1 text-[10px] py-1 rounded bg-destructive text-destructive-foreground hover:opacity-80" onClick={() => handleCancelLesson(lesson.id)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmCancelId(item.id)} className="text-xs text-destructive hover:opacity-70 flex items-center gap-1">
                    <X className="w-3 h-3" /> Cancel session
                  </button>
                ))}
              </div>
            );
          }}
        />
      )}

      {/* Booking Dialog */}
      <Dialog open={!!bookingCoach} onOpenChange={open => !open && setBookingCoach(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{done ? 'Request Submitted' : `Book a Session with ${bookingCoach?.name}`}</DialogTitle>
          </DialogHeader>
          {done ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
              <p className="font-medium text-foreground">Your request has been sent!</p>
              <p className="text-sm text-muted-foreground">{bookingCoach?.name} will confirm within 24 hours.</p>
              <Button className="w-full" onClick={() => { setBookingCoach(null); setTab('my'); }}>View My Sessions</Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Select a Date</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {DAYS.map(day => {
                    const isSel = day.toDateString() === selectedDay.toDateString();
                    return (
                      <button key={day.toDateString()} type="button" onClick={() => { setSelectedDay(day); setSelectedSlot(''); }}
                        className={cn('flex flex-col items-center px-3 py-2 rounded-xl text-xs shrink-0 transition-all border',
                          isSel ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                        )}>
                        <span className="text-[10px]">{WEEKDAYS[day.getDay()]}</span>
                        <span className="text-base font-semibold leading-tight">{day.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Select a Time (60 min)</p>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map(slot => {
                    const taken = isSlotTaken(slot);
                    const isSel = selectedSlot === slot;
                    return (
                      <button key={slot} type="button" disabled={taken} onClick={() => setSelectedSlot(slot)}
                        className={cn('py-2 rounded-lg text-sm border transition-all',
                          taken ? 'bg-muted text-muted-foreground/40 border-border cursor-not-allowed line-through'
                            : isSel ? 'bg-primary text-primary-foreground border-primary font-medium'
                            : 'bg-card text-foreground border-border hover:border-primary/40'
                        )}>{slot}</button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Notes (optional)</p>
                <Textarea placeholder="Any goals, injuries, or requests…" rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="resize-none text-sm" />
              </div>
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Session fee</span>
                <span className="font-bold text-primary text-base">{bookingCoach?.privateLessonPrice ? formatCurrency(bookingCoach.privateLessonPrice) : 'TBD'}</span>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBookingCoach(null)}>Cancel</Button>
                <Button disabled={!selectedSlot} onClick={handleConfirm}>Submit Request</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
