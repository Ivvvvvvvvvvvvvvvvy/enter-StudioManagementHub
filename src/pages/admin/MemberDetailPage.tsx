import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardTypeBadge, BookingStatusBadge, OrderStatusBadge, formatDate, formatDateTime, formatCurrency } from '@/components/shared/badges';
import { ArrowLeft, Phone, Calendar, CreditCard, BookOpen, TrendingUp, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOpenConversation } from '@/hooks/useOpenConversation';

export default function AdminMemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getUser, getCustomerCards, getCustomerBookings, getCustomerOrders, getCourse, getSession, state } = useStore();
  const openConversation = useOpenConversation('/admin/messages');

  const customer = getUser(id!);
  const adminId = state.users.find(u => u.role === 'admin')?.id ?? '';
  const cards = getCustomerCards(id!);
  const bookings = getCustomerBookings(id!).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const orders = getCustomerOrders(id!).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const activeCard = cards.find(c => c.isActive);
  const totalSpent = orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.amount, 0);

  if (!customer) {
    return <div className="p-6 text-center text-muted-foreground"><p>Member not found.</p><Button variant="outline" className="mt-4" onClick={() => navigate('/admin/members')}>Back to Members</Button></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4 -ml-1" onClick={() => navigate('/admin/members')}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Members
      </Button>

      {/* Member header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-serif font-bold text-2xl shrink-0">
          {customer.name[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-2xl font-semibold text-foreground">{customer.name}</h1>
                {activeCard && <CardTypeBadge type={activeCard.type} />}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Joined {formatDate(customer.joinDate)}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => openConversation(customer.id, adminId, 'admin')}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Message
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Bookings', value: bookings.length, icon: <BookOpen className="w-4 h-4" /> },
          { label: 'Attended', value: bookings.filter(b => b.status === 'attended').length, icon: <Calendar className="w-4 h-4" /> },
          { label: 'Total Spent', value: formatCurrency(totalSpent), icon: <TrendingUp className="w-4 h-4" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className="text-muted-foreground mb-1 flex justify-center">{s.icon}</div>
              <div className="font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Booking history */}
        <div>
          <h2 className="font-medium text-foreground mb-3">Booking History ({bookings.length})</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {bookings.map(b => {
              const session = getSession(b.sessionId);
              const course = session ? getCourse(session.courseId) : undefined;
              return (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border text-sm">
                  <div>
                    <div className="font-medium text-foreground">{course?.name ?? 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{session ? formatDateTime(session.datetime) : '—'}</div>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Membership cards */}
        <div>
          <h2 className="font-medium text-foreground mb-3">Membership Passes ({cards.length})</h2>
          <div className="space-y-2">
            {cards.map(card => (
              <Card key={card.id} className={cn('overflow-hidden', !card.isActive && 'opacity-60')}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <CardTypeBadge type={card.type} />
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Expires {formatDate(card.expiry)}
                        {card.totalSessions && ` · ${card.totalSessions - card.usedSessions}/${card.totalSessions} remaining`}
                      </div>
                    </div>
                  </div>
                  <span className="font-medium text-foreground">{formatCurrency(card.price)}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order history */}
          <h2 className="font-medium text-foreground mt-5 mb-3">Orders ({orders.length})</h2>
          <div className="space-y-2">
            {orders.slice(0, 5).map(o => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border text-sm">
                <div>
                  <div className="font-medium text-foreground">{o.description}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(o.amount)}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
