import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { trackEvent } from '@enter-pro/analytics-sdk';
import { WeekCalendar, getWeekStart, type WeekSlotItem } from '@/components/shared/WeekCalendar';
import { formatDate, formatTime, isUpcoming, canCancel, getCourseTypePaleClass } from '@/components/shared/badges';
import { BookingStatusBadge } from '@/components/shared/badges';
import { Button } from '@/components/ui/button';
import { X, Calendar, ArrowRight, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useOpenConversation } from '@/hooks/useOpenConversation';

export default function MyBookingsPage() {
  const { state, getCourse, getSession, getUser, dispatch } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const customerId = user?.userId ?? '';
  const openConversation = useOpenConversation('/messages');

  const [showAll, setShowAll] = useState(true);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const handleCancel = (bookingId: string) => {
    dispatch({ type: 'CANCEL_BOOKING', payload: bookingId });
    trackEvent('class_cancelled', { eventType: 'custom', properties: { booking_id: bookingId } });
    toast({ title: 'Booking cancelled' });
    setConfirmCancelId(null);
  };

  // Determine the best initial week: week of the most recent past booking, or current week
  const initialWeek = useMemo(() => {
    const myBookings = state.bookings.filter(b => b.customerId === customerId && b.status !== 'cancelled');
    if (myBookings.length === 0) return undefined;
    // Find the datetime of the nearest past session (most recent attended), fallback to earliest upcoming
    const datetimes = myBookings
      .map(b => getSession(b.sessionId)?.datetime)
      .filter(Boolean) as string[];
    if (datetimes.length === 0) return undefined;
    const now = new Date();
    const past = datetimes.filter(dt => new Date(dt) <= now).sort().reverse();
    const future = datetimes.filter(dt => new Date(dt) > now).sort();
    const anchor = past[0] ?? future[0];
    return anchor ? new Date(anchor) : undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.bookings, customerId]);

  // Build WeekSlotItem list from bookings
  const items = useMemo<WeekSlotItem[]>(() => {
    return state.bookings
      .filter(b => b.customerId === customerId)
      .filter(b => {
        if (showAll) return b.status !== 'cancelled';
        const s = getSession(b.sessionId);
        return s && isUpcoming(s.datetime) && b.status !== 'cancelled';
      })
      .map(b => {
        const session = getSession(b.sessionId);
        const course = session ? getCourse(session.courseId) : undefined;
        const coach = session ? getUser(session.coachId) : undefined;
        if (!session || !course) return null;

        const past = !isUpcoming(session.datetime);
        const cancelled = b.status === 'cancelled';

        let colorClass = getCourseTypePaleClass(course.type);
        if (cancelled) colorClass = 'bg-muted text-muted-foreground border-border';

        return {
          id: b.id,
          datetime: session.datetime,
          label: course.name,
          sublabel: `${formatTime(session.datetime)} · ${coach?.name?.split(' ')[0] ?? ''}`,
          colorClass,
          dimmed: past || cancelled,
        } satisfies WeekSlotItem;
      })
      .filter(Boolean) as WeekSlotItem[];
  }, [state.bookings, customerId, showAll, getSession, getCourse, getUser]);

  const toolbar = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowAll(v => !v)}
        className={cn(
          'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
          showAll
            ? 'bg-foreground text-background border-foreground'
            : 'bg-card text-muted-foreground border-border hover:border-primary/30'
        )}
      >
        {showAll ? 'All history' : 'Upcoming only'}
      </button>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate('/courses')}>
        <Calendar className="w-3 h-3 mr-1" /> Browse Classes
      </Button>
    </div>
  );

  return (
    <WeekCalendar
      title="My Bookings"
      items={items}
      toolbar={toolbar}
      initialWeek={initialWeek}
      renderPopover={(item, onClose) => {
        const booking = state.bookings.find(b => b.id === item.id);
        if (!booking) return null;
        const session = getSession(booking.sessionId);
        const course = session ? getCourse(session.courseId) : undefined;
        const coach = session ? getUser(session.coachId) : undefined;
        if (!session || !course) return null;
        const canCancelBooking = canCancel(session.datetime, state.studio.cancelPolicy);
        const isCancelling = confirmCancelId === item.id;

        return (
          <div>
            <div className="flex items-start justify-between mb-2">
              <div className="font-semibold text-xs">{course.name}</div>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 mb-2.5">
              <div>{formatDate(session.datetime)} · {formatTime(session.datetime)}</div>
              <div>{session.room}</div>
              <div>{coach?.name}</div>
            </div>
            <div className="flex items-center justify-between mb-2.5">
              <BookingStatusBadge status={booking.status} />
              <button
                type="button"
                onClick={() => { onClose(); navigate(`/courses/${course.id}`); }}
                className="flex items-center gap-0.5 text-[11px] text-primary hover:opacity-70 transition-opacity font-medium"
              >
                View course <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {booking.notes && <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-1 mb-2.5">{booking.notes}</p>}
            {coach && (
              <button
                type="button"
                onClick={() => { openConversation(customerId, coach.id, 'coach'); onClose(); }}
                className="mb-2.5 w-full flex items-center justify-center gap-1 text-[10px] py-1.5 rounded border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <MessageSquare className="w-2.5 h-2.5" /> Message {coach.name.split(' ')[0]}
              </button>
            )}
            {canCancelBooking && booking.status !== 'cancelled' && (
              isCancelling ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground">Cancel this booking?</p>
                  <div className="flex gap-1.5">
                    <button type="button" className="flex-1 text-[10px] py-1 rounded border border-border hover:bg-muted transition-colors"
                      onClick={() => setConfirmCancelId(null)}>Keep</button>
                    <button type="button" className="flex-1 text-[10px] py-1 rounded bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity"
                      onClick={() => handleCancel(booking.id)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmCancelId(item.id)}
                  className="text-xs text-destructive hover:opacity-70 transition-opacity flex items-center gap-1">
                  <X className="w-3 h-3" /> Cancel booking
                </button>
              )
            )}
          </div>
        );
      }}
    />
  );
}
