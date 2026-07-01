import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { WeekCalendar, type WeekSlotItem } from '@/components/shared/WeekCalendar';
import { formatDate, formatTime, formatCurrency } from '@/components/shared/badges';
import { CheckCircle2, HelpCircle, XCircle, X, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { PrivateLessonStatus } from '@/lib/types';
import { useOpenConversation } from '@/hooks/useOpenConversation';

const STATUS_COLOR: Record<PrivateLessonStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-primary-pale text-primary border-primary/25',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABEL: Record<PrivateLessonStatus, string> = {
  pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled',
};

export default function CoachPrivateLessonsPage() {
  const { getCoachPrivateLessons, getUser, dispatch } = useStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const coachId = user?.userId ?? 'coach-1';
  const openConversation = useOpenConversation('/messages');

  const [showAll, setShowAll] = useState(false);

  const lessons = getCoachPrivateLessons(coachId);
  const pending = lessons.filter(pl => pl.status === 'pending');
  const confirmed = lessons.filter(pl => pl.status === 'confirmed');
  const completed = lessons.filter(pl => pl.status === 'completed');

  const handleConfirm = (id: string) => { dispatch({ type: 'UPDATE_PRIVATE_LESSON_STATUS', payload: { id, status: 'confirmed' } }); toast({ title: 'Session confirmed' }); };
  const handleDecline = (id: string) => { dispatch({ type: 'UPDATE_PRIVATE_LESSON_STATUS', payload: { id, status: 'cancelled' } }); toast({ title: 'Request declined' }); };
  const handleComplete = (id: string) => { dispatch({ type: 'UPDATE_PRIVATE_LESSON_STATUS', payload: { id, status: 'completed' } }); toast({ title: 'Marked as completed' }); };

  const items = useMemo<WeekSlotItem[]>(() => {
    return lessons
      .filter(pl => showAll || pl.status === 'pending' || pl.status === 'confirmed')
      .map(pl => {
        const customer = getUser(pl.customerId);
        return {
          id: pl.id,
          datetime: pl.datetime,
          label: customer?.name ?? 'Student',
          sublabel: `${formatTime(pl.datetime)} · ${pl.duration} min`,
          colorClass: STATUS_COLOR[pl.status],
          dimmed: pl.status === 'cancelled' || pl.status === 'completed',
        } satisfies WeekSlotItem;
      });
  }, [lessons, showAll]);

  const toolbar = (
    <div className="flex items-center gap-2">
      {[
        { label: `${pending.length} Pending`, icon: <HelpCircle className="w-3 h-3" />, color: 'text-amber-600' },
        { label: `${confirmed.length} Confirmed`, icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-primary' },
        { label: `${completed.length} Done`, icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-muted-foreground' },
      ].map(s => (
        <div key={s.label} className={cn('flex items-center gap-1 text-xs font-medium', s.color)}>
          {s.icon}{s.label}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setShowAll(v => !v)}
        className={cn(
          'ml-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
          showAll ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:border-primary/30'
        )}
      >{showAll ? 'All' : 'Active'}</button>
    </div>
  );

  return (
    <WeekCalendar
      title="Private Sessions"
      items={items}
      toolbar={toolbar}
      renderPopover={(item, onClose) => {
        const lesson = lessons.find(pl => pl.id === item.id);
        if (!lesson) return null;
        const customer = getUser(lesson.customerId);
        const isPast = new Date(lesson.datetime) < new Date();

        return (
          <div>
            <div className="flex items-start justify-between mb-2">
              <div className="font-semibold text-xs">{customer?.name ?? 'Student'}</div>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 mb-2.5">
              <div>{formatDate(lesson.datetime)} · {formatTime(lesson.datetime)}</div>
              <div>{lesson.duration} min</div>
              <div className="font-semibold text-primary">{formatCurrency(lesson.price)}</div>
            </div>
            <span className={cn('inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium mb-3', STATUS_COLOR[lesson.status])}>
              {STATUS_LABEL[lesson.status]}
            </span>
            {lesson.notes && <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-1 mb-3 line-clamp-2">Note: {lesson.notes}</p>}

            {lesson.status === 'pending' && (
              <div className="flex gap-1.5">
                <button type="button" onClick={() => { handleConfirm(lesson.id); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-0.5 text-[10px] py-1 rounded bg-primary text-primary-foreground hover:opacity-90">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Accept
                </button>
                <button type="button" onClick={() => { handleDecline(lesson.id); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-0.5 text-[10px] py-1 rounded border border-destructive text-destructive hover:bg-destructive/10">
                  <XCircle className="w-2.5 h-2.5" /> Decline
                </button>
              </div>
            )}
            {lesson.status === 'confirmed' && isPast && (
              <button type="button" onClick={() => { handleComplete(lesson.id); onClose(); }}
                className="w-full flex items-center justify-center gap-1 text-[10px] py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90">
                <CheckCircle2 className="w-2.5 h-2.5" /> Mark Completed
              </button>
            )}
            <button
              type="button"
              onClick={() => { openConversation(lesson.customerId, coachId, 'coach'); onClose(); }}
              className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] py-1.5 rounded border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <MessageSquare className="w-2.5 h-2.5" /> Message Student
            </button>
          </div>
        );
      }}
    />
  );
}
