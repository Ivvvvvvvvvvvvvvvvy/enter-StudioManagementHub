import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type {
  Studio, User, Course, ClassSession, Booking,
  MembershipCard, Order, Attendance, BookingStatus,
  SessionStatus, OrderStatus, PrivateLesson, PrivateLessonStatus,
  Conversation, Message, CardType, OrderType, AttendanceStatus,
} from './types';
import {
  STUDIO as INITIAL_STUDIO,
  USERS as INITIAL_USERS,
  COURSES as INITIAL_COURSES,
  CLASS_SESSIONS as INITIAL_SESSIONS,
} from './mock-data';
import { supabase } from '@/integrations/supabase/client';

interface StoreState {
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

type StoreAction =
  | { type: 'LOAD_DYNAMIC'; payload: Partial<Pick<StoreState, 'bookings' | 'cards' | 'orders' | 'attendances' | 'privateLessons' | 'conversations' | 'messages'>> }
  | { type: 'UPDATE_STUDIO'; payload: Partial<Studio> }
  | { type: 'ADD_COURSE'; payload: Course }
  | { type: 'UPDATE_COURSE'; payload: Course }
  | { type: 'DELETE_COURSE'; payload: string }
  | { type: 'ADD_SESSION'; payload: ClassSession }
  | { type: 'UPDATE_SESSION'; payload: ClassSession }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'ADD_BOOKING'; payload: Booking }
  | { type: 'UPDATE_BOOKING_STATUS'; payload: { id: string; status: BookingStatus } }
  | { type: 'CANCEL_BOOKING'; payload: string }
  | { type: 'UPDATE_SESSION_STATUS'; payload: { id: string; status: SessionStatus } }
  | { type: 'UPDATE_ATTENDANCE'; payload: Attendance }
  | { type: 'ADD_CARD'; payload: MembershipCard }
  | { type: 'UPDATE_CARD'; payload: MembershipCard }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { id: string; status: OrderStatus } }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'ADD_PRIVATE_LESSON'; payload: PrivateLesson }
  | { type: 'UPDATE_PRIVATE_LESSON_STATUS'; payload: { id: string; status: PrivateLessonStatus } }
  | { type: 'ADD_CONVERSATION'; payload: Conversation }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'MARK_MESSAGES_READ'; payload: { conversationId: string; readerId: string } };

function reducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'LOAD_DYNAMIC':
      return { ...state, ...action.payload };
    case 'UPDATE_STUDIO':
      return { ...state, studio: { ...state.studio, ...action.payload } };
    case 'ADD_COURSE':
      return { ...state, courses: [...state.courses, action.payload] };
    case 'UPDATE_COURSE':
      return { ...state, courses: state.courses.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_COURSE':
      return { ...state, courses: state.courses.filter(c => c.id !== action.payload) };
    case 'ADD_SESSION':
      return { ...state, sessions: [...state.sessions, action.payload] };
    case 'UPDATE_SESSION':
      return { ...state, sessions: state.sessions.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SESSION':
      return { ...state, sessions: state.sessions.filter(s => s.id !== action.payload) };
    case 'ADD_BOOKING':
      return { ...state, bookings: [...state.bookings, action.payload] };
    case 'UPDATE_BOOKING_STATUS':
      return { ...state, bookings: state.bookings.map(b => b.id === action.payload.id ? { ...b, status: action.payload.status } : b) };
    case 'CANCEL_BOOKING':
      return { ...state, bookings: state.bookings.map(b => b.id === action.payload ? { ...b, status: 'cancelled' } : b) };
    case 'UPDATE_SESSION_STATUS':
      return { ...state, sessions: state.sessions.map(s => s.id === action.payload.id ? { ...s, status: action.payload.status } : s) };
    case 'UPDATE_ATTENDANCE': {
      const existing = state.attendances.find(a => a.bookingId === action.payload.bookingId);
      if (existing) {
        return { ...state, attendances: state.attendances.map(a => a.bookingId === action.payload.bookingId ? action.payload : a) };
      }
      return { ...state, attendances: [...state.attendances, action.payload] };
    }
    case 'ADD_CARD':
      return { ...state, cards: [...state.cards, action.payload] };
    case 'UPDATE_CARD':
      return { ...state, cards: state.cards.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'ADD_ORDER':
      return { ...state, orders: [...state.orders, action.payload] };
    case 'UPDATE_ORDER_STATUS':
      return { ...state, orders: state.orders.map(o => o.id === action.payload.id ? { ...o, status: action.payload.status } : o) };
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u) };
    case 'ADD_PRIVATE_LESSON':
      return { ...state, privateLessons: [...state.privateLessons, action.payload] };
    case 'UPDATE_PRIVATE_LESSON_STATUS':
      return {
        ...state,
        privateLessons: state.privateLessons.map(pl =>
          pl.id === action.payload.id ? { ...pl, status: action.payload.status } : pl
        ),
      };
    case 'ADD_CONVERSATION':
      return { ...state, conversations: [...state.conversations, action.payload] };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        conversations: state.conversations.map(c =>
          c.id === action.payload.conversationId
            ? { ...c, lastMessage: action.payload.text, lastMessageAt: action.payload.createdAt }
            : c
        ),
      };
    case 'MARK_MESSAGES_READ': {
      // No-op if there's nothing unread to update — avoids creating a new
      // state object on every render (which would trigger an update loop).
      const hasUnread = state.messages.some(m =>
        m.conversationId === action.payload.conversationId &&
        m.senderId !== action.payload.readerId &&
        !m.read
      );
      if (!hasUnread) return state;
      return {
        ...state,
        messages: state.messages.map(m =>
          m.conversationId === action.payload.conversationId && m.senderId !== action.payload.readerId
            ? { ...m, read: true }
            : m
        ),
      };
    }
    default:
      return state;
  }
}

const initialState: StoreState = {
  studio: INITIAL_STUDIO,
  users: INITIAL_USERS,
  courses: INITIAL_COURSES,
  sessions: INITIAL_SESSIONS,
  // Dynamic slices — loaded from Enter Cloud on mount
  bookings: [],
  cards: [],
  orders: [],
  attendances: [],
  privateLessons: [],
  conversations: [],
  messages: [],
};

// ── DB row → TS type mappers ───────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromBooking = (r: any): Booking => ({
  id: r.id, sessionId: r.session_id, customerId: r.customer_id,
  status: r.status as BookingStatus, notes: r.notes ?? '', createdAt: r.created_at,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromCard = (r: any): MembershipCard => ({
  id: r.id, customerId: r.customer_id, type: r.type as CardType,
  totalSessions: r.total_sessions ?? undefined, usedSessions: r.used_sessions,
  price: r.price, expiry: r.expiry, purchaseDate: r.purchase_date, isActive: r.is_active,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromOrder = (r: any): Order => ({
  id: r.id, customerId: r.customer_id, type: r.type as OrderType,
  amount: r.amount, status: r.status as OrderStatus, description: r.description,
  createdAt: r.created_at, membershipCardId: r.membership_card_id ?? undefined,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromAttendance = (r: any): Attendance => ({
  bookingId: r.booking_id, status: r.status as AttendanceStatus, markedAt: r.marked_at ?? undefined,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromPrivateLesson = (r: any): PrivateLesson => ({
  id: r.id, customerId: r.customer_id, coachId: r.coach_id, datetime: r.datetime,
  duration: r.duration, status: r.status as PrivateLessonStatus, notes: r.notes ?? '',
  price: r.price, createdAt: r.created_at,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromConversation = (r: any): Conversation => ({
  id: r.id, customerId: r.customer_id, participantId: r.participant_id,
  participantRole: r.participant_role as 'admin' | 'coach',
  sessionId: r.session_id ?? undefined, lastMessage: r.last_message ?? undefined,
  lastMessageAt: r.last_message_at, createdAt: r.created_at,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromMessage = (r: any): Message => ({
  id: r.id, conversationId: r.conversation_id, senderId: r.sender_id,
  text: r.text, createdAt: r.created_at, read: r.read,
});

// ── Supabase sync (fire-and-forget on mutations) ───────────
async function syncToSupabase(action: StoreAction) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  try {
    switch (action.type) {
      case 'ADD_BOOKING':
        await db.from('bookings').insert({
          id: action.payload.id, session_id: action.payload.sessionId,
          customer_id: action.payload.customerId, status: action.payload.status,
          notes: action.payload.notes, created_at: action.payload.createdAt,
        });
        break;
      case 'UPDATE_BOOKING_STATUS':
        await db.from('bookings').update({ status: action.payload.status }).eq('id', action.payload.id);
        break;
      case 'CANCEL_BOOKING':
        await db.from('bookings').update({ status: 'cancelled' }).eq('id', action.payload);
        break;
      case 'UPDATE_ATTENDANCE':
        await db.from('attendances').upsert({
          booking_id: action.payload.bookingId, status: action.payload.status,
          marked_at: action.payload.markedAt ?? null,
        });
        break;
      case 'ADD_CARD':
        await db.from('membership_cards').insert({
          id: action.payload.id, customer_id: action.payload.customerId,
          type: action.payload.type, total_sessions: action.payload.totalSessions ?? null,
          used_sessions: action.payload.usedSessions, price: action.payload.price,
          expiry: action.payload.expiry, purchase_date: action.payload.purchaseDate,
          is_active: action.payload.isActive,
        });
        break;
      case 'UPDATE_CARD':
        await db.from('membership_cards').update({
          type: action.payload.type, total_sessions: action.payload.totalSessions ?? null,
          used_sessions: action.payload.usedSessions, price: action.payload.price,
          expiry: action.payload.expiry, purchase_date: action.payload.purchaseDate,
          is_active: action.payload.isActive,
        }).eq('id', action.payload.id);
        break;
      case 'ADD_ORDER':
        await db.from('orders').insert({
          id: action.payload.id, customer_id: action.payload.customerId,
          type: action.payload.type, amount: action.payload.amount,
          status: action.payload.status, description: action.payload.description,
          created_at: action.payload.createdAt,
          membership_card_id: action.payload.membershipCardId ?? null,
        });
        break;
      case 'UPDATE_ORDER_STATUS':
        await db.from('orders').update({ status: action.payload.status }).eq('id', action.payload.id);
        break;
      case 'ADD_PRIVATE_LESSON':
        await db.from('private_lessons').insert({
          id: action.payload.id, customer_id: action.payload.customerId,
          coach_id: action.payload.coachId, datetime: action.payload.datetime,
          duration: action.payload.duration, status: action.payload.status,
          notes: action.payload.notes, price: action.payload.price,
          created_at: action.payload.createdAt,
        });
        break;
      case 'UPDATE_PRIVATE_LESSON_STATUS':
        await db.from('private_lessons').update({ status: action.payload.status }).eq('id', action.payload.id);
        break;
      case 'ADD_CONVERSATION':
        await db.from('conversations').insert({
          id: action.payload.id, customer_id: action.payload.customerId,
          participant_id: action.payload.participantId,
          participant_role: action.payload.participantRole,
          session_id: action.payload.sessionId ?? null,
          last_message: action.payload.lastMessage ?? null,
          last_message_at: action.payload.lastMessageAt,
          created_at: action.payload.createdAt,
        });
        break;
      case 'ADD_MESSAGE':
        await db.from('messages').insert({
          id: action.payload.id, conversation_id: action.payload.conversationId,
          sender_id: action.payload.senderId, text: action.payload.text,
          created_at: action.payload.createdAt, read: action.payload.read,
        });
        await db.from('conversations')
          .update({ last_message: action.payload.text, last_message_at: action.payload.createdAt })
          .eq('id', action.payload.conversationId);
        break;
      case 'MARK_MESSAGES_READ':
        await db.from('messages')
          .update({ read: true })
          .eq('conversation_id', action.payload.conversationId)
          .neq('sender_id', action.payload.readerId);
        break;
    }
  } catch (e) {
    console.error('[store] Supabase sync error:', action.type, e);
  }
}

interface StoreContextType {
  state: StoreState;
  dispatch: React.Dispatch<StoreAction>;
  loading: boolean;
  // Selectors
  getUser: (id: string) => User | undefined;
  getCourse: (id: string) => Course | undefined;
  getSession: (id: string) => ClassSession | undefined;
  getSessionBookings: (sessionId: string) => Booking[];
  getCustomerBookings: (customerId: string) => Booking[];
  getCoachSessions: (coachId: string) => ClassSession[];
  getCustomerCards: (customerId: string) => MembershipCard[];
  getCustomerOrders: (customerId: string) => Order[];
  getAttendance: (bookingId: string) => Attendance | undefined;
  getBookingCount: (sessionId: string) => number;
  getCustomerPrivateLessons: (customerId: string) => PrivateLesson[];
  getCoachPrivateLessons: (coachId: string) => PrivateLesson[];
  getConversations: (userId: string, role: string) => Conversation[];
  getMessages: (conversationId: string) => Message[];
  getUnreadCount: (userId: string) => number;
  customers: User[];
  coaches: User[];
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = React.useState(true);

  // ── Fetch all dynamic data from Enter Cloud on mount ──
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    Promise.all([
      db.from('bookings').select('*'),
      db.from('membership_cards').select('*'),
      db.from('orders').select('*'),
      db.from('attendances').select('*'),
      db.from('private_lessons').select('*'),
      db.from('conversations').select('*'),
      db.from('messages').select('*'),
    ]).then(([b, c, o, a, pl, conv, msg]: Array<{ data: unknown[] | null }>) => {
      dispatch({
        type: 'LOAD_DYNAMIC',
        payload: {
          bookings:      (b.data   ?? []).map(fromBooking),
          cards:         (c.data   ?? []).map(fromCard),
          orders:        (o.data   ?? []).map(fromOrder),
          attendances:   (a.data   ?? []).map(fromAttendance),
          privateLessons:(pl.data  ?? []).map(fromPrivateLesson),
          conversations: (conv.data ?? []).map(fromConversation),
          messages:      (msg.data ?? []).map(fromMessage),
        },
      });
      setLoading(false);
    }).catch((err: unknown) => {
      console.error('[store] Failed to load from Enter Cloud:', err);
      setLoading(false);
    });
  }, []);

  // ── Wrapped dispatch that also syncs to Enter Cloud ───
  // Stable identity so effects that depend on `dispatch` don't re-fire every render.
  const syncDispatch: React.Dispatch<StoreAction> = useCallback((action: StoreAction) => {
    dispatch(action);
    void syncToSupabase(action);
  }, []);

  const getUser = (id: string) => state.users.find(u => u.id === id);
  const getCourse = (id: string) => state.courses.find(c => c.id === id);
  const getSession = (id: string) => state.sessions.find(s => s.id === id);
  const getSessionBookings = (sessionId: string) => state.bookings.filter(b => b.sessionId === sessionId && b.status !== 'cancelled');
  const getCustomerBookings = (customerId: string) => state.bookings.filter(b => b.customerId === customerId);
  const getCoachSessions = (coachId: string) => state.sessions.filter(s => s.coachId === coachId);
  const getCustomerCards = (customerId: string) => state.cards.filter(c => c.customerId === customerId);
  const getCustomerOrders = (customerId: string) => state.orders.filter(o => o.customerId === customerId);
  const getAttendance = (bookingId: string) => state.attendances.find(a => a.bookingId === bookingId);
  const getBookingCount = (sessionId: string) => state.bookings.filter(b => b.sessionId === sessionId && b.status !== 'cancelled').length;
  const getCustomerPrivateLessons = (customerId: string) => state.privateLessons.filter(pl => pl.customerId === customerId);
  const getCoachPrivateLessons = (coachId: string) => state.privateLessons.filter(pl => pl.coachId === coachId);
  const getConversations = (userId: string, role: string) => {
    if (role === 'admin') return state.conversations;
    if (role === 'coach') return state.conversations.filter(
      c => c.participantId === userId || c.customerId === userId,
    );
    return state.conversations.filter(c => c.customerId === userId);
  };
  const getMessages = (conversationId: string) => state.messages.filter(m => m.conversationId === conversationId);
  const getUnreadCount = (userId: string) => state.messages.filter(m => m.senderId !== userId && !m.read).length;

  const customers = state.users.filter(u => u.role === 'customer');
  const coaches = state.users.filter(u => u.role === 'coach');

  return (
    <StoreContext.Provider value={{
      state, dispatch: syncDispatch, loading,
      getUser, getCourse, getSession,
      getSessionBookings, getCustomerBookings, getCoachSessions,
      getCustomerCards, getCustomerOrders, getAttendance,
      getBookingCount, getCustomerPrivateLessons, getCoachPrivateLessons,
      getConversations, getMessages, getUnreadCount,
      customers, coaches,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
