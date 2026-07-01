import type {
  Studio,
  User,
  Course,
  ClassSession,
  Booking,
  MembershipCard,
  Order,
  Attendance,
  PrivateLesson,
  Conversation,
  Message,
} from '@/lib/types';

export interface SnapshotInput {
  studio: Studio;
  users: User[];
  courses: Course[];
  sessions: ClassSession[];
  bookings: Booking[];
  cards: MembershipCard[];
  orders: Order[];
  attendances: Attendance[];
  privateLessons: PrivateLesson[];
  conversations: Conversation[];
  messages: Message[];
}

export interface BusinessSnapshot {
  /** Human-readable summary report injected into the agent context. */
  text: string;
  /** Complete raw dataset (every record, every field) as a JSON string. */
  detailJson: string;
  /** Structured copy (also forwarded as state for programmatic use). */
  data: Record<string, unknown>;
  generatedAt: string;
}

const DAY = 24 * 60 * 60 * 1000;

function parseDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function yuan(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Build a real, human-readable business snapshot from the admin's live store
 * (mock master data + Enter Cloud transactional data — exactly what the admin
 * sees in the dashboard). This is injected into the agent so it reasons over
 * real numbers instead of fabricating a dataset.
 */
export function buildBusinessSnapshot(input: SnapshotInput): BusinessSnapshot {
  const now = new Date();
  const { studio, users, courses, sessions, bookings, cards, orders, attendances, privateLessons, conversations, messages } = input;

  const customers = users.filter((u) => u.role === 'customer');
  const coaches = users.filter((u) => u.role === 'coach');
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  // ---- Members: active vs sleeping (no booking activity in last 30 days) ----
  const lastActivity = new Map<string, number>();
  for (const b of bookings) {
    const sess = sessionById.get(b.sessionId);
    const t = parseDate(sess?.datetime)?.getTime() ?? parseDate(b.createdAt)?.getTime();
    if (t == null) continue;
    const prev = lastActivity.get(b.customerId) ?? 0;
    if (t > prev) lastActivity.set(b.customerId, t);
  }
  const sleepingThreshold = now.getTime() - 30 * DAY;
  const sleepingMembers = customers.filter((c) => (lastActivity.get(c.id) ?? 0) < sleepingThreshold);
  const activeMembers = customers.filter((c) => (lastActivity.get(c.id) ?? 0) >= sleepingThreshold);

  // ---- Revenue: paid orders, this month + trailing 6 months ----
  const paidOrders = orders.filter((o) => o.status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const thisMonth = monthKey(now);
  const monthlyRevenue = new Map<string, number>();
  for (const o of paidOrders) {
    const d = parseDate(o.createdAt);
    if (!d) continue;
    const k = monthKey(d);
    monthlyRevenue.set(k, (monthlyRevenue.get(k) ?? 0) + (o.amount || 0));
  }
  const trailing6: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = monthKey(d);
    trailing6.push({ month: k, revenue: Math.round(monthlyRevenue.get(k) ?? 0) });
  }
  const thisMonthRevenue = Math.round(monthlyRevenue.get(thisMonth) ?? 0);

  // Revenue split by order type (this month)
  const revenueByType = new Map<string, number>();
  for (const o of paidOrders) {
    revenueByType.set(o.type, (revenueByType.get(o.type) ?? 0) + (o.amount || 0));
  }

  // ---- Membership cards & renewal reminders (expiring within 14 days) ----
  const activeCards = cards.filter((c) => c.isActive);
  const expiringSoon = activeCards
    .map((c) => ({ card: c, expiry: parseDate(c.expiry) }))
    .filter((x) => x.expiry && x.expiry.getTime() >= now.getTime() && x.expiry.getTime() <= now.getTime() + 14 * DAY)
    .sort((a, b) => (a.expiry!.getTime() - b.expiry!.getTime()));
  const expiredCards = activeCards.filter((c) => {
    const e = parseDate(c.expiry);
    return e != null && e.getTime() < now.getTime();
  });
  // Sessions-type cards nearly used up (<=2 remaining)
  const lowBalanceCards = activeCards.filter(
    (c) => c.totalSessions != null && c.totalSessions - c.usedSessions <= 2 && c.totalSessions - c.usedSessions >= 0,
  );

  // ---- Course occupancy (upcoming + recent scheduled sessions) ----
  const activeBookingStatuses = new Set(['confirmed', 'attended']);
  const courseStats = new Map<string, { capacity: number; booked: number; sessions: number }>();
  for (const s of sessions) {
    const course = courseById.get(s.courseId);
    if (!course) continue;
    const booked = bookings.filter((b) => b.sessionId === s.id && activeBookingStatuses.has(b.status)).length;
    const cur = courseStats.get(s.courseId) ?? { capacity: 0, booked: 0, sessions: 0 };
    cur.capacity += course.capacity;
    cur.booked += booked;
    cur.sessions += 1;
    courseStats.set(s.courseId, cur);
  }
  const occupancy = Array.from(courseStats.entries())
    .map(([courseId, st]) => ({
      course: courseById.get(courseId)?.name ?? courseId,
      sessions: st.sessions,
      capacity: st.capacity,
      booked: st.booked,
      rate: st.capacity > 0 ? Math.round((st.booked / st.capacity) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  // ---- Attendance rate ----
  const present = attendances.filter((a) => a.status === 'present').length;
  const absent = attendances.filter((a) => a.status === 'absent').length;
  const attendanceTotal = present + absent;
  const attendanceRate = attendanceTotal > 0 ? Math.round((present / attendanceTotal) * 100) : null;

  // ---- Private lessons ----
  const plByStatus = new Map<string, number>();
  for (const pl of privateLessons) plByStatus.set(pl.status, (plByStatus.get(pl.status) ?? 0) + 1);
  const plRevenue = privateLessons
    .filter((pl) => pl.status === 'completed' || pl.status === 'confirmed')
    .reduce((sum, pl) => sum + (pl.price || 0), 0);

  // ---------- Build readable text ----------
  const lines: string[] = [];
  lines.push(`# ${studio.name} — live business data snapshot`);
  lines.push(`Generated at: ${now.toLocaleString('en-US')} (sourced from the admin back office; all figures are real).`);
  lines.push('');

  lines.push('## Members overview');
  lines.push(`- Total members: ${customers.length}`);
  lines.push(`- Active members (booked in the last 30 days): ${activeMembers.length}`);
  lines.push(`- Dormant members (no booking in the last 30 days): ${sleepingMembers.length}`);
  lines.push(`- Coaches: ${coaches.length}`);
  if (sleepingMembers.length > 0) {
    const names = sleepingMembers.slice(0, 30).map((m) => m.name).join(', ');
    lines.push(`- Dormant member list: ${names}${sleepingMembers.length > 30 ? ', …' : ''}`);
  }
  lines.push('');

  lines.push('## Revenue');
  lines.push(`- Total collected (paid orders): ${yuan(totalRevenue)}`);
  lines.push(`- This month (${thisMonth}) revenue: ${yuan(thisMonthRevenue)}`);
  lines.push(`- Trailing 6-month revenue: ${trailing6.map((m) => `${m.month} ${yuan(m.revenue)}`).join(', ')}`);
  if (revenueByType.size > 0) {
    const typeLabel: Record<string, string> = {
      membership: 'Memberships',
      single_class: 'Single classes',
      private_lesson: 'Private lessons',
    };
    lines.push(
      `- Revenue breakdown: ${Array.from(revenueByType.entries()).map(([t, v]) => `${typeLabel[t] ?? t} ${yuan(v)}`).join(', ')}`,
    );
  }
  lines.push('');

  lines.push('## Membership cards / renewal reminders');
  lines.push(`- Active cards: ${activeCards.length}`);
  lines.push(`- Expiring within 14 days (renewal reminder needed): ${expiringSoon.length}`);
  if (expiringSoon.length > 0) {
    for (const x of expiringSoon.slice(0, 30)) {
      lines.push(`  · ${userName(x.card.customerId)} (${x.card.type} card) expires ${x.card.expiry}`);
    }
  }
  if (expiredCards.length > 0) lines.push(`- Cards expired but still marked active: ${expiredCards.length} (please review)`);
  if (lowBalanceCards.length > 0) {
    lines.push(
      `- Session cards with ≤2 sessions left: ${lowBalanceCards.length} — ${lowBalanceCards
        .slice(0, 20)
        .map((c) => `${userName(c.customerId)} (${(c.totalSessions ?? 0) - c.usedSessions} left)`)
        .join(', ')}`,
    );
  }
  lines.push('');

  lines.push('## Class fill rate');
  if (occupancy.length === 0) {
    lines.push('- No schedule data yet');
  } else {
    for (const o of occupancy) {
      lines.push(`- ${o.course}: ${o.rate}% full (${o.booked}/${o.capacity} seats across ${o.sessions} sessions)`);
    }
  }
  if (attendanceRate != null) lines.push(`- Overall attendance rate: ${attendanceRate}% (present ${present}, absent ${absent})`);
  lines.push('');

  lines.push('## Private lessons');
  lines.push(`- Total private lessons: ${privateLessons.length}`);
  if (plByStatus.size > 0) {
    const statusLabel: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    lines.push(`- Status breakdown: ${Array.from(plByStatus.entries()).map(([s, n]) => `${statusLabel[s] ?? s} ${n}`).join(', ')}`);
  }
  lines.push(`- Private lesson revenue (confirmed/completed): ${yuan(plRevenue)}`);

  const text = lines.join('\n');

  // ---------- Complete raw dataset (every record, every field) ----------
  // The agent gets the full detail so it can answer ANY question down to the
  // individual record, not just the summaries above.
  const detail = {
    generatedAt: now.toISOString(),
    note: 'Below is the studio\u2019s complete raw detail data — every record and every field. All analysis must be based on this real data; do not fabricate.',
    studio,
    users: users.map((u) => ({
      id: u.id, name: u.name, phone: u.phone, role: u.role, joinDate: u.joinDate,
      bio: u.bio, specialties: u.specialties, privateLessonPrice: u.privateLessonPrice,
      startWeight: u.startWeight, currentWeight: u.currentWeight, targetWeight: u.targetWeight,
      height: u.height, weightGoalStartDate: u.weightGoalStartDate,
      dietPreferences: u.dietPreferences, healthNotes: u.healthNotes,
      weeklyGoalClasses: u.weeklyGoalClasses, dailyWaterGoal: u.dailyWaterGoal,
      sleepGoal: u.sleepGoal, dailyCalorieGoal: u.dailyCalorieGoal,
    })),
    courses,
    sessions,
    bookings,
    attendances,
    membershipCards: cards,
    orders,
    privateLessons,
    conversations,
    messages,
    counts: {
      users: users.length, courses: courses.length, sessions: sessions.length,
      bookings: bookings.length, attendances: attendances.length, cards: cards.length,
      orders: orders.length, privateLessons: privateLessons.length,
      conversations: conversations.length, messages: messages.length,
    },
  };
  const detailJson = JSON.stringify(detail);

  const data: Record<string, unknown> = {
    studio: { name: studio.name },
    members: {
      total: customers.length,
      active: activeMembers.length,
      sleeping: sleepingMembers.length,
      coaches: coaches.length,
      sleepingNames: sleepingMembers.map((m) => m.name),
    },
    revenue: {
      total: Math.round(totalRevenue),
      thisMonth: thisMonthRevenue,
      trailing6,
      byType: Object.fromEntries(Array.from(revenueByType.entries()).map(([k, v]) => [k, Math.round(v)])),
    },
    cards: {
      active: activeCards.length,
      expiringSoon: expiringSoon.map((x) => ({ member: userName(x.card.customerId), type: x.card.type, expiry: x.card.expiry })),
      expired: expiredCards.length,
      lowBalance: lowBalanceCards.map((c) => ({ member: userName(c.customerId), remaining: (c.totalSessions ?? 0) - c.usedSessions })),
    },
    courses: { occupancy, attendanceRate, present, absent },
    privateLessons: { total: privateLessons.length, byStatus: Object.fromEntries(plByStatus), revenue: Math.round(plRevenue) },
  };

  return { text, detailJson, data, generatedAt: now.toISOString() };
}
