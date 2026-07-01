import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CourseTypeBadge, BookingStatusBadge, formatDate, formatTime } from '@/components/shared/badges';
import { ArrowLeft, Check, X, Users, Clock, MapPin, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useOpenConversation } from '@/hooks/useOpenConversation';
import { avatarStyle } from '@/lib/avatar';

export default function CoachClassDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { getSession, getCourse, getSessionBookings, getUser, getAttendance, dispatch } = useStore();
  const openConversation = useOpenConversation('/messages');
  const coachId = user?.userId ?? '';

  const session = getSession(id!);
  const course = session ? getCourse(session.courseId) : undefined;
  const bookings = session ? getSessionBookings(session.id) : [];
  const isPast = session ? new Date(session.datetime) < new Date() : false;

  if (!session || !course) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Session not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/coach')}>Back to Schedule</Button>
      </div>
    );
  }

  const handleAttendance = (bookingId: string, present: boolean) => {
    dispatch({ type: 'UPDATE_ATTENDANCE', payload: { bookingId, status: present ? 'present' : 'absent', markedAt: new Date().toISOString() } });
    dispatch({ type: 'UPDATE_BOOKING_STATUS', payload: { id: bookingId, status: present ? 'attended' : 'absent' } });
    toast({ title: present ? 'Marked as attended' : 'Marked as absent' });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4 -ml-1" onClick={() => navigate('/coach')}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Schedule
      </Button>

      {/* Session info */}
      <Card className="mb-5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <CourseTypeBadge type={course.type} />
            {isPast && <Badge variant="secondary">Completed</Badge>}
          </div>
          <h2 className="font-serif text-xl font-semibold text-foreground mt-2 mb-3">{course.name}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{formatDate(session.datetime)} · {formatTime(session.datetime)}</div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{session.room}</div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4" />{bookings.length} enrolled / {course.capacity} capacity</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{course.duration} minutes</div>
          </div>
        </CardContent>
      </Card>

      {/* Student list */}
      <h2 className="font-medium text-foreground mb-3">
        Students ({bookings.length})
        {isPast && <span className="text-xs text-muted-foreground ml-2">Mark attendance below</span>}
      </h2>

      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No enrolled students yet.</p>
      ) : (
        <div className="space-y-2">
          {bookings.map(booking => {
            const customer = getUser(booking.customerId);
            const attendance = getAttendance(booking.id);
            const isPresent = attendance?.status === 'present';
            const isAbsent = attendance?.status === 'absent';

            return (
              <Card key={booking.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden flex items-center justify-center font-semibold text-sm"
                        style={!customer?.avatar ? avatarStyle(customer?.id ?? '') : undefined}>
                        {customer?.avatar
                          ? <img src={customer.avatar} alt={customer.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                          : customer?.name[0] ?? '?'}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-foreground">{customer?.name ?? 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{customer?.phone}</div>
                        {booking.notes && <div className="text-xs text-muted-foreground mt-0.5 italic">"{booking.notes}"</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <BookingStatusBadge status={booking.status} />
                      <button
                        type="button"
                        title="Message student"
                        onClick={() => openConversation(booking.customerId, coachId, 'coach')}
                        className="w-7 h-7 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      {isPast && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleAttendance(booking.id, true)}
                            className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors border',
                              isPresent ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                            )}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendance(booking.id, false)}
                            className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors border',
                              isAbsent ? 'bg-destructive text-white border-destructive' : 'border-border text-muted-foreground hover:border-destructive/40'
                            )}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
