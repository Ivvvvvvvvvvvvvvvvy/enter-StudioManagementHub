import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useCourseAI } from '@/hooks/useCourseAI';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { CourseTypeBadge, formatDate, formatTime } from '@/components/shared/badges';
import { ArrowLeft, CheckCircle2, Clock, MapPin, Users, AlertCircle, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Booking } from '@/lib/types';
import { trackEvent } from '@enter-pro/analytics-sdk';

export default function BookingPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { state, getCourse, getUser, getSession, getBookingCount, dispatch } = useStore();

  const session = getSession(sessionId!);
  const course = session ? getCourse(session.courseId) : undefined;
  const coach = session ? getUser(session.coachId) : undefined;
  const booked = session ? getBookingCount(session.id) : 0;
  const remaining = course ? course.capacity - booked : 0;
  const authCustomer = user ? state.users.find(u => u.id === user.userId) : undefined;
  const customerId = authCustomer?.id ?? user?.userId;
  const alreadyBooked = !!(customerId && session && state.bookings.some(
    b => b.sessionId === session.id && b.customerId === customerId && b.status === 'confirmed'
  ));

  const { media } = useCourseAI(course?.id ?? '');

  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [done, setDone] = useState(false);

  if (!session || !course) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Session not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/courses')}>Back to Classes</Button>
      </div>
    );
  }

  if (alreadyBooked && !done) {
    return (
      <div className="p-6 max-w-md mx-auto text-center pt-16">
        <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
        <h2 className="font-semibold text-foreground mb-2">Already booked</h2>
        <p className="text-sm text-muted-foreground mb-4">You already have a confirmed booking for this session.</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate('/my-bookings')}>My Bookings</Button>
          <Button onClick={() => navigate('/courses')}>Browse Other Classes</Button>
        </div>
      </div>
    );
  }

  if (remaining <= 0 && !done) {
    return (
      <div className="p-6 max-w-md mx-auto text-center pt-16">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-semibold text-foreground mb-2">Session Full</h2>
        <p className="text-sm text-muted-foreground mb-4">No available spots for this session.</p>
        <Button onClick={() => navigate('/courses')}>Browse Other Classes</Button>
      </div>
    );
  }

  const handleConfirm = () => {
    const customerId = authCustomer?.id ?? user?.userId ?? `guest-${Date.now()}`;
    const newBooking: Booking = {
      id: `book-${Date.now()}`,
      sessionId: session.id,
      customerId,
      status: 'confirmed',
      notes,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_BOOKING', payload: newBooking });
    trackEvent('class_booked', { eventType: 'conversion', properties: { session_id: session.id, course_name: course.name } });
    setDone(true);
    toast({ title: 'Booking confirmed!' });
  };

  const hasVideo = !!media?.video_url;
  const heroImage = media?.images?.[0] ?? null;

  if (done) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="text-center py-10">
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-1">You're booked!</h2>
          <p className="text-sm text-muted-foreground mb-6">See you in class{authCustomer ? `, ${authCustomer.name}` : ''}.</p>
          <Card className="text-left mb-6">
            <CardContent className="p-4 space-y-2 text-sm">
              {[
                ['Class', course.name],
                ['Date', formatDate(session.datetime)],
                ['Time', formatTime(session.datetime)],
                ['Room', session.room],
                ['Instructor', coach?.name ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/courses')}>Browse More</Button>
            <Button className="flex-1" onClick={() => navigate('/my-bookings')}>My Bookings</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Media hero: video or image */}
      {(hasVideo || heroImage) && (
        <div className="relative w-full aspect-video overflow-hidden">
          {hasVideo ? (
            <video
              src={media!.video_url!}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <img
              src={heroImage!}
              alt={course.name}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="font-serif text-xl font-semibold text-white">{course.name}</h2>
            <p className="text-white/70 text-sm">with {coach?.name}</p>
          </div>
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3 left-3 flex items-center gap-1 text-white/80 hover:text-white bg-black/25 hover:bg-black/45 rounded-full px-3 py-1.5 text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-6">
        {/* Back button (when no hero) */}
        {!hasVideo && !heroImage && (
          <Button variant="ghost" size="sm" className="mb-5 -ml-1" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        )}

        {/* AI Description */}
        {media?.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {media.description}
          </p>
        )}

        {/* Session card */}
        <Card className="mb-4">
          <CardContent className="p-5">
            <CourseTypeBadge type={course.type} />
            {(hasVideo || heroImage) ? (
              <p className="text-sm text-muted-foreground mt-2 mb-4">with {coach?.name}</p>
            ) : (
              <>
                <h2 className="font-serif text-xl font-semibold text-foreground mt-2 mb-0.5">{course.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">with {coach?.name}</p>
              </>
            )}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                {formatDate(session.datetime)} · {formatTime(session.datetime)} · {course.duration} min
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" /> {session.room}
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 shrink-0" />
                <span className={remaining <= 3 ? 'text-destructive font-medium' : ''}>
                  {remaining} spot{remaining !== 1 ? 's' : ''} left
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI image strip (if images available and no video) */}
        {!hasVideo && (media?.images?.length ?? 0) > 1 && (
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {media!.images.slice(0, 3).map((url, i) => (
              <div key={i} className="aspect-video rounded-md overflow-hidden">
                <img src={url} alt={`${course.name} ${i + 1}`} className="w-full h-full object-cover" crossOrigin="anonymous" />
              </div>
            ))}
          </div>
        )}

        {/* Optional notes toggle */}
        <button
          type="button"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
          onClick={() => setShowNotes(v => !v)}
        >
          <ChevronDown className={cn('w-4 h-4 transition-transform', showNotes && 'rotate-180')} />
          Add a note (optional)
        </button>
        {showNotes && (
          <Textarea
            placeholder="Any special requests or health considerations..."
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="resize-none mb-4"
          />
        )}

        <Button className="w-full h-11 text-base" onClick={handleConfirm}>
          Confirm Booking
        </Button>
      </div>
    </div>
  );
}
