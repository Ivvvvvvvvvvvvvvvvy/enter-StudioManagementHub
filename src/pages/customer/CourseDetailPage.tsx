import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useCourseAI } from '@/hooks/useCourseAI';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CourseTypeBadge, getCourseTypeSolidClass, formatDate, formatTime } from '@/components/shared/badges';
import { ArrowLeft, Clock, MapPin, Users, BookOpen, ChevronRight, Play, ImageIcon, Sparkles, MessageSquare, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import type { Conversation } from '@/lib/types';

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCourse, getUser, state, getBookingCount, dispatch } = useStore();
  const { user } = useAuth();
  const { media, loading } = useCourseAI(id!);

  const [lightbox, setLightbox] = useState<string | null>(null);

  const course = getCourse(id!);
  const coach = course ? getUser(course.coachId) : undefined;
  const userId = user?.userId ?? '';

  // Start or resume a conversation then jump to /messages
  function openConversation(participantId: string, participantRole: 'admin' | 'coach') {
    const existing = state.conversations.find(
      c => c.customerId === userId && c.participantId === participantId
    );
    if (existing) {
      navigate('/messages', { state: { convId: existing.id } });
      return;
    }
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      customerId: userId,
      participantId,
      participantRole,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CONVERSATION', payload: newConv });
    navigate('/messages', { state: { convId: newConv.id } });
  }

  const sessions = course
    ? state.sessions
        .filter(s => s.courseId === course.id && s.status === 'scheduled' && new Date(s.datetime) > new Date())
        .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    : [];

  if (!course) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Class not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/courses')}>Back to Classes</Button>
      </div>
    );
  }

  const hasVideo = !!media?.video_url;
  const hasImages = (media?.images?.length ?? 0) > 0;
  const hasDescription = !!media?.description;
  const isGenerating = media?.status && !['idle', 'done', 'error'].includes(media.status);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero: Video or gradient banner */}
      <div className="relative w-full aspect-video bg-muted overflow-hidden">
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
          <div className={cn('w-full h-full flex items-center justify-center', getCourseTypeSolidClass(course.type))}>
            {isGenerating ? (
              <div className="text-center text-white/80">
                <div className="animate-spin w-8 h-8 border-2 border-white/40 border-t-white rounded-full mx-auto mb-2" />
                <p className="text-sm">Video generating...</p>
              </div>
            ) : (
              <Play className="w-16 h-16 text-white/30" />
            )}
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* Course name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-2">
            <CourseTypeBadge type={course.type} />
            {hasVideo && (
              <span className="flex items-center gap-1 text-xs text-white/70 bg-black/30 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" /> AI Video
              </span>
            )}
          </div>
          <h1 className="font-serif text-3xl font-semibold text-white">{course.name}</h1>
          <p className="text-white/70 text-sm mt-1">{course.duration} min · ${course.price} / session</p>
        </div>
        {/* Back button */}
        <button
          onClick={() => navigate('/courses')}
          className="absolute top-4 left-4 flex items-center gap-1 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full px-3 py-1.5 text-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Course info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Description */}
          <div>
            <p className="text-muted-foreground leading-relaxed">
              {hasDescription ? media!.description : course.description}
              {!hasDescription && !loading && !isGenerating && (
                <span className="text-xs text-muted-foreground/60 ml-2">(AI description not yet generated)</span>
              )}
            </p>
            {isGenerating && !hasDescription && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <div className="animate-spin w-3 h-3 border border-muted-foreground/40 border-t-muted-foreground rounded-full" />
                Generating AI description...
              </div>
            )}
          </div>

          {/* AI Image Gallery */}
          {hasImages && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Class Gallery</h2>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3" /> AI Generated
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {media!.images.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox(url)}
                    className="aspect-video rounded-lg overflow-hidden hover:opacity-90 transition-opacity relative group"
                  >
                    <img
                      src={url}
                      alt={`${course.name} ${i + 1}`}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {isGenerating && !hasImages && (
            <div className="grid grid-cols-3 gap-2">
              {[0,1,2].map(i => (
                <div key={i} className="aspect-video rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {/* Notes */}
          {course.notes && (
            <Card className="border-dashed">
              <CardContent className="p-4 flex gap-3">
                <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">What to Bring / Notes</p>
                  <p className="text-sm text-muted-foreground">{course.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Coach card */}
          {coach && (
            <Card className="cursor-pointer hover:border-primary/40 transition-colors group"
              onClick={() => navigate(`/coaches/${coach.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={cn('w-14 h-14 rounded-full shrink-0 overflow-hidden border-2 border-border group-hover:border-primary/40 transition-colors',
                    !coach.avatar && getCourseTypeSolidClass(course.type)
                  )}>
                    {coach.avatar ? (
                      <img src={coach.avatar} alt={coach.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-serif text-xl font-semibold">
                        {coach.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Your Instructor</p>
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{coach.name} →</h3>
                    {coach.specialties && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {coach.specialties.map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                        ))}
                      </div>
                    )}
                    {coach.bio && <p className="text-sm text-muted-foreground leading-relaxed">{coach.bio}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Session picker */}
        <div className="space-y-4">
          <div>
          <h2 className="font-medium text-foreground mb-3">Upcoming Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No upcoming sessions available.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => {
                const booked = getBookingCount(s.id);
                const remaining = course.capacity - booked;
                const fillPct = Math.round((booked / course.capacity) * 100);
                const isFull = remaining <= 0;
                const userAlreadyBooked = !!userId && state.bookings.some(
                  b => b.sessionId === s.id && b.customerId === userId && b.status !== 'cancelled'
                );
                return (
                  <Card key={s.id} className={cn('overflow-hidden', (isFull || userAlreadyBooked) && 'opacity-70')}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-sm font-medium text-foreground">{formatDate(s.datetime)}</div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(s.datetime)}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.room}</span>
                          </div>
                        </div>
                        <Button size="sm" disabled={isFull || userAlreadyBooked} onClick={() => navigate(`/booking/${s.id}`)} className="shrink-0">
                          {userAlreadyBooked ? 'Booked' : isFull ? 'Full' : 'Book'}
                          {!isFull && !userAlreadyBooked && <ChevronRight className="w-3 h-3 ml-1" />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={fillPct} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground shrink-0">
                          <Users className="w-3 h-3 inline mr-0.5" />{remaining}/{course.capacity}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          </div>

          {/* Inquiry card — only for customers */}
          {user?.role === 'customer' && (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Have a question?</p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const adminId = state.users.find(u => u.role === 'admin')?.id ?? 'admin-1';
                      openConversation(adminId, 'admin');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 text-left transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Ask Studio Admin</div>
                      <div className="text-xs text-muted-foreground">Pricing, membership & general queries</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                  </button>
                  {coach && (
                    <button
                      onClick={() => openConversation(coach.id, 'coach')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 text-left transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-border group-hover:border-primary/40">
                        {coach.avatar ? (
                          <img src={coach.avatar} alt={coach.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {coach.name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          Message {coach.name.split(' ')[0]}
                        </div>
                        <div className="text-xs text-muted-foreground">Class-specific questions</div>
                      </div>
                      <MessageSquare className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Gallery"
            className="max-w-full max-h-full rounded-lg object-contain"
            crossOrigin="anonymous"
          />
        </div>
      )}
    </div>
  );
}
