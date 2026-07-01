export type CourseType = string; // open-ended: yoga, pilates, meditation, barre, hiit, dance, boxing, stretching, spin, or any custom value
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type BookingStatus = 'confirmed' | 'cancelled' | 'attended' | 'absent';
export type CardType = 'monthly' | 'sessions' | 'annual';
export type OrderType = 'membership' | 'single_class' | 'private_lesson';
export type OrderStatus = 'paid' | 'pending' | 'refunded';
export type UserRole = 'customer' | 'coach' | 'admin';
export type AttendanceStatus = 'present' | 'absent' | 'pending';
export type PrivateLessonStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Studio {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  hours: string;
  cancelPolicy: string;
  announcement?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  specialties?: string[];
  privateLessonPrice?: number;
  joinDate: string;
  // Weight goal tracking (customers only)
  startWeight?: number;    // kg at journey start
  currentWeight?: number;  // kg current
  targetWeight?: number;   // kg goal
  height?: number;         // cm (for BMI)
  weightGoalStartDate?: string; // ISO date when goal was set
  // Health profile (customers only)
  dietPreferences?: string[];  // e.g. ['vegetarian','low-carb']
  healthNotes?: string;
  weeklyGoalClasses?: number;
  dailyWaterGoal?: number; // glasses
  sleepGoal?: number;      // hours
  dailyCalorieGoal?: number; // kcal (food intake target)
}

export interface Course {
  id: string;
  name: string;
  type: CourseType;
  description: string;
  notes: string;
  coachId: string;
  capacity: number;
  price: number;
  duration: number;
  coverColor?: string;
  calories?: number; // estimated kcal burn per session
  level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
}

export interface ClassSession {
  id: string;
  courseId: string;
  coachId: string;
  datetime: string;
  room: string;
  status: SessionStatus;
}

export interface Booking {
  id: string;
  sessionId: string;
  customerId: string;
  status: BookingStatus;
  notes: string;
  createdAt: string;
}

export interface Attendance {
  bookingId: string;
  status: AttendanceStatus;
  markedAt?: string;
}

export interface MembershipCard {
  id: string;
  customerId: string;
  type: CardType;
  totalSessions: number | null;
  usedSessions: number;
  price: number;
  expiry: string;
  purchaseDate: string;
  isActive: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  type: OrderType;
  amount: number;
  status: OrderStatus;
  description: string;
  createdAt: string;
  membershipCardId?: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  participantId: string;
  participantRole: 'admin' | 'coach';
  sessionId?: string;
  lastMessage?: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface PrivateLesson {
  id: string;
  customerId: string;
  coachId: string;
  datetime: string;
  duration: number;
  status: PrivateLessonStatus;
  notes: string;
  price: number;
  createdAt: string;
}
