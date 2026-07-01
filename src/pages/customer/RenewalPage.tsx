import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CardTypeBadge, OrderStatusBadge, formatDate, formatCurrency } from '@/components/shared/badges';
import { CreditCard, CheckCircle2, Clock, Repeat, ShieldCheck, Zap, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CardType } from '@/lib/types';

interface CardPlan {
  type: CardType;
  label: string;
  price: number;
  totalSessions: number | null;
  validDays: number;
  desc: string;
  tag?: string;
  icon: React.ReactNode;
  perks: string[];
}

const CARD_PLANS: CardPlan[] = [
  {
    type: 'monthly', label: 'Monthly Pass', price: 1200, totalSessions: null, validDays: 30,
    desc: 'Unlimited classes for 30 days', icon: <Repeat className="w-5 h-5" />,
    perks: ['Unlimited group classes', 'Online booking & cancellation', 'Access to all class types', 'Class recording library'],
  },
  {
    type: 'sessions', label: '10-Class Pack', price: 1100, totalSessions: 10, validDays: 90,
    desc: '10 classes, valid for 90 days', tag: 'Popular', icon: <Zap className="w-5 h-5" />,
    perks: ['10 group class credits', 'Valid for 90 days', 'Flexible scheduling', 'Use on any class type'],
  },
  {
    type: 'sessions', label: '20-Class Pack', price: 2000, totalSessions: 20, validDays: 90,
    desc: '20 classes, valid for 90 days', icon: <Zap className="w-5 h-5" />,
    perks: ['20 group class credits', 'Valid for 90 days', '5% off private sessions', 'Use on any class type'],
  },
  {
    type: 'annual', label: 'Annual Pass', price: 9800, totalSessions: null, validDays: 365,
    desc: 'Unlimited classes for a full year', tag: 'Best Value', icon: <ShieldCheck className="w-5 h-5" />,
    perks: ['Unlimited group classes', '10% off all private sessions', 'Priority booking window', '2 guest passes per month', 'Members-only events & workshops'],
  },
];

export default function RenewalPage() {
  const { getCustomerCards, getCustomerOrders, dispatch } = useStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const customerId = user?.userId ?? '';

  const cards = getCustomerCards(customerId);
  const orders = getCustomerOrders(customerId).filter(o => o.type === 'membership');
  const activeCard = cards.find(c => c.isActive);

  const [selectedPlan, setSelectedPlan] = useState<CardPlan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handlePurchase = () => {
    if (!selectedPlan) return;
    const now = new Date().toISOString();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + selectedPlan.validDays);
    const cardId = `card-new-${Date.now()}`;
    dispatch({
      type: 'ADD_CARD',
      payload: { id: cardId, customerId, type: selectedPlan.type, totalSessions: selectedPlan.totalSessions, usedSessions: 0, price: selectedPlan.price, expiry: expiryDate.toISOString(), purchaseDate: now, isActive: true },
    });
    dispatch({
      type: 'ADD_ORDER',
      payload: { id: `ord-new-${Date.now()}`, customerId, type: 'membership', amount: selectedPlan.price, status: 'paid', description: `${selectedPlan.label} (renewed)`, createdAt: now, membershipCardId: cardId },
    });
    setConfirmOpen(false);
    setSelectedPlan(null);
    toast({ title: 'Membership activated!', description: `Your ${selectedPlan.label} is now active.` });
  };

  const daysLeft = activeCard
    ? Math.max(0, Math.ceil((new Date(activeCard.expiry).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="font-serif text-2xl font-semibold text-foreground mb-1">Membership</h1>
      <p className="text-muted-foreground text-sm mb-6">View your current pass and renew or upgrade</p>

      {/* Current card */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-foreground">Current Membership</span>
                {activeCard ? <CardTypeBadge type={activeCard.type} /> : <Badge variant="secondary">No Active Pass</Badge>}
              </div>
              {activeCard ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Expires</div>
                    <div className="text-sm font-medium text-foreground mt-0.5">{formatDate(activeCard.expiry)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Days Remaining</div>
                    <div className={cn('text-sm font-medium mt-0.5', daysLeft <= 7 ? 'text-destructive' : 'text-foreground')}>
                      {daysLeft} day{daysLeft !== 1 ? 's' : ''}{daysLeft <= 7 && ' ⚠'}
                    </div>
                  </div>
                  {activeCard.totalSessions !== null && (
                    <div>
                      <div className="text-xs text-muted-foreground">Classes Left</div>
                      <div className="text-sm font-medium text-foreground mt-0.5">
                        {activeCard.totalSessions - activeCard.usedSessions} / {activeCard.totalSessions}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Purchase a membership pass to start booking classes.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan selection */}
      <h2 className="font-medium text-foreground mb-3">Choose a Plan</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {CARD_PLANS.map((plan, i) => (
          <button key={i} type="button" onClick={() => setSelectedPlan(plan)}
            className={cn('relative text-left p-4 rounded-xl border-2 transition-all card-hover',
              selectedPlan === plan ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/30'
            )}
          >
            {plan.tag && (
              <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">{plan.tag}</span>
            )}
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', selectedPlan === plan ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                {plan.icon}
              </div>
              <span className="font-medium text-foreground">{plan.label}</span>
            </div>
            <div className="text-xl font-bold text-foreground mb-1">{formatCurrency(plan.price)}</div>
            <div className="text-xs text-muted-foreground mb-3">{plan.desc}</div>
            <ul className="space-y-1">
              {plan.perks.map((perk, pi) => (
                <li key={pi} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className={cn('w-3 h-3 shrink-0', selectedPlan === plan ? 'text-primary' : 'text-muted-foreground/50')} />
                  {perk}
                </li>
              ))}
            </ul>
            {selectedPlan === plan && <CheckCircle2 className="absolute bottom-3 right-3 w-4 h-4 text-primary" />}
          </button>
        ))}
      </div>

      <Button className="w-full h-11" disabled={!selectedPlan} onClick={() => setConfirmOpen(true)}>
        Purchase Membership
      </Button>

      {/* Purchase history */}
      {orders.length > 0 && (
        <div className="mt-8">
          <h2 className="font-medium text-foreground mb-3">Purchase History</h2>
          <div className="space-y-2">
            {orders.slice().reverse().map(ord => (
              <div key={ord.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{ord.description}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(ord.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{formatCurrency(ord.amount)}</span>
                  <OrderStatusBadge status={ord.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Purchase</DialogTitle></DialogHeader>
          {selectedPlan && (
            <div className="py-2 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Plan</span><span className="font-medium">{selectedPlan.label}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Valid For</span><span className="font-medium">{selectedPlan.validDays} days</span></div>
              {selectedPlan.totalSessions && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Classes</span><span className="font-medium">{selectedPlan.totalSessions} sessions</span></div>}
              <div className="flex justify-between text-sm border-t border-border pt-3">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg text-primary">{formatCurrency(selectedPlan.price)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handlePurchase}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
