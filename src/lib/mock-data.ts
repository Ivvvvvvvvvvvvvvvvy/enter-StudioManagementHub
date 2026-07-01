import type {
  Studio, User, Course, ClassSession, Booking,
  MembershipCard, Order, Attendance, PrivateLesson, Conversation, Message
} from './types';

// ── Date helper ───────────────────────────────────────────
function dateStr(daysFromNow: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ── Studio ────────────────────────────────────────────────
export const STUDIO: Studio = {
  name: 'Zenith Studio',
  tagline: 'Move. Breathe. Transform.',
  address: '888 Wellness Blvd, Suite 300, Downtown District',
  phone: '+1 (555) 234-5678',
  hours: 'Mon–Sat 7:00–21:00 · Sun 8:00–20:00',
  cancelPolicy: '24',
  announcement: 'Welcome to Zenith Studio! New members enjoy 10% off their first membership pass.',
};

// ── Users ─────────────────────────────────────────────────
export const USERS: User[] = [
  // Admin
  { id: 'admin-1', name: 'Diana Lin', phone: '138-0000-0001', role: 'admin', joinDate: '2023-01-01' },

  // Coaches
  {
    id: 'coach-1',
    name: 'Sarah Chen',
    phone: '138-1111-0001',
    role: 'coach',
    avatar: 'https://grazia-prod.oss-ap-southeast-1.aliyuncs.com/resources/uid_100047491/coach_sarah_1972f931.png',
    bio: 'A certified RYT-500 instructor with 10 years of teaching experience. Trained in Mysore, India. Specialises in dynamic Vinyasa flow and gentle Hatha practice.',
    specialties: ['Hatha Yoga', 'Vinyasa Flow', 'Postnatal Recovery'],
    privateLessonPrice: 400,
    joinDate: '2023-03-15',
  },
  {
    id: 'coach-2',
    name: 'Maya Zhao',
    phone: '138-1111-0002',
    role: 'coach',
    avatar: 'https://grazia-prod.oss-ap-southeast-1.aliyuncs.com/resources/uid_100047491/coach_portrait_854cc309.png',
    bio: 'Former professional dancer turned PMA-certified Pilates instructor. Expert in postural correction, core rehabilitation, and apparatus training.',
    specialties: ['Apparatus Pilates', 'Mat Pilates', 'Postural Correction'],
    privateLessonPrice: 450,
    joinDate: '2023-04-01',
  },
  {
    id: 'coach-3',
    name: 'Noah Wang',
    phone: '138-1111-0003',
    role: 'coach',
    avatar: 'https://grazia-prod.oss-ap-southeast-1.aliyuncs.com/resources/uid_100047491/coach_noah_dcbf566d.png',
    bio: 'MBSR-certified mindfulness teacher with a background in clinical psychology. Guides students through breath-based practices for stress reduction and mental clarity.',
    specialties: ['Mindfulness Meditation', 'Breathwork', 'Stress Relief'],
    privateLessonPrice: 350,
    joinDate: '2023-05-10',
  },
  {
    id: 'coach-4',
    name: 'Zoe Park',
    phone: '138-1111-0004',
    role: 'coach',
    avatar: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop&q=80',
    bio: 'Former ballet dancer with 8 years of barre and dance fitness experience. Trained at the Paris Opera Ballet School. Brings grace, precision, and high energy to every class.',
    specialties: ['Barre', 'Ballet Fitness', 'Dance Cardio'],
    privateLessonPrice: 420,
    joinDate: '2023-06-01',
  },
  {
    id: 'coach-5',
    name: 'Jordan Lee',
    phone: '138-1111-0005',
    role: 'coach',
    avatar: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&h=300&fit=crop&q=80',
    bio: 'NASM-certified personal trainer and HIIT specialist with a background in competitive athletics. Passionate about functional fitness and helping clients push their limits safely.',
    specialties: ['HIIT', 'Strength Training', 'Athletic Conditioning'],
    privateLessonPrice: 480,
    joinDate: '2023-07-15',
  },

  // Customers
  { id: 'cust-1',  name: 'Emily Zhang',  phone: '139-2001-0001', role: 'customer', joinDate: '2024-01-10', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&q=80',  startWeight: 68, currentWeight: 62, targetWeight: 56, height: 163, weightGoalStartDate: '2024-01-10' },
  { id: 'cust-2',  name: 'Jessica Li',   phone: '139-2001-0002', role: 'customer', joinDate: '2024-02-14', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&q=80',  startWeight: 72, currentWeight: 65, targetWeight: 60, height: 168, weightGoalStartDate: '2024-02-14' },
  { id: 'cust-3',  name: 'Lily Liu',     phone: '139-2001-0003', role: 'customer', joinDate: '2024-03-05', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&q=80',  startWeight: 60, currentWeight: 57, targetWeight: 54, height: 158, weightGoalStartDate: '2024-03-05' },
  { id: 'cust-4',  name: 'Amy Wang',     phone: '139-2001-0004', role: 'customer', joinDate: '2024-03-20', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80',  startWeight: 75, currentWeight: 68, targetWeight: 62, height: 165, weightGoalStartDate: '2024-03-20' },
  { id: 'cust-5',  name: 'Mia Chen',     phone: '139-2001-0005', role: 'customer', joinDate: '2024-04-01', avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&q=80',  startWeight: 65, currentWeight: 61, targetWeight: 57, height: 160, weightGoalStartDate: '2024-04-01' },
  { id: 'cust-6',  name: 'Sophie Yang',  phone: '139-2001-0006', role: 'customer', joinDate: '2024-04-15', avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&q=80',  startWeight: 70, currentWeight: 66, targetWeight: 62, height: 166, weightGoalStartDate: '2024-04-15' },
  { id: 'cust-7',  name: 'Hannah Wu',    phone: '139-2001-0007', role: 'customer', joinDate: '2024-05-02', avatar: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=400&h=400&fit=crop&q=80',  startWeight: 63, currentWeight: 60, targetWeight: 56, height: 161, weightGoalStartDate: '2024-05-02' },
  { id: 'cust-8',  name: 'Rachel Sun',   phone: '139-2001-0008', role: 'customer', joinDate: '2024-05-20', avatar: 'https://images.unsplash.com/photo-1542740348-39501cd6e2b4?w=400&h=400&fit=crop&q=80',  startWeight: 78, currentWeight: 72, targetWeight: 65, height: 170, weightGoalStartDate: '2024-05-20' },
  { id: 'cust-9',  name: 'Chloe Xu',    phone: '139-2001-0009', role: 'customer', joinDate: '2024-06-01', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&q=80',  startWeight: 58, currentWeight: 56, targetWeight: 53, height: 156, weightGoalStartDate: '2024-06-01' },
  { id: 'cust-10', name: 'Grace Zhu',   phone: '139-2001-0010', role: 'customer', joinDate: '2024-06-15', avatar: 'https://images.unsplash.com/photo-1589156229687-496a31ad1d1f?w=400&h=400&fit=crop&q=80',  startWeight: 66, currentWeight: 62, targetWeight: 58, height: 162, weightGoalStartDate: '2024-06-15' },
];

// ── Courses ───────────────────────────────────────────────
export const COURSES: Course[] = [
  // ── Yoga ────────────────────────────────────────────────
  {
    id: 'course-1',
    name: 'Morning Flow',
    type: 'yoga',
    description: 'Energise your morning with a dynamic Vinyasa sequence that links breath to movement. Suitable for all levels. Build strength, flexibility, and mental clarity to carry through your day.',
    notes: 'Bring your own mat. Wear comfortable, form-fitting clothing. Arrive 5 minutes early.',
    coachId: 'coach-1',
    capacity: 12,
    price: 120,
    duration: 60,
    calories: 220,
    level: 'All Levels',
  },
  {
    id: 'course-2',
    name: 'Hatha Foundations',
    type: 'yoga',
    description: 'A foundational course exploring classical Hatha postures with proper alignment cues. Ideal for beginners seeking a thorough introduction to yoga practice.',
    notes: 'Blocks and straps provided. Beginners warmly welcome.',
    coachId: 'coach-1',
    capacity: 15,
    price: 110,
    duration: 75,
    calories: 190,
    level: 'Beginner',
  },
  {
    id: 'course-11',
    name: 'Sunset Vinyasa',
    type: 'yoga',
    description: 'Wind down and reconnect with your body in this evening Vinyasa class. Fluid sequences, hip openers, and a long savasana help you release the stress of the day.',
    notes: 'Props available. Suitable for those with at least 3 months of yoga experience.',
    coachId: 'coach-1',
    capacity: 12,
    price: 120,
    duration: 60,
    calories: 240,
    level: 'Intermediate',
  },

  // ── Pilates ──────────────────────────────────────────────
  {
    id: 'course-3',
    name: 'Mat Pilates',
    type: 'pilates',
    description: 'A core-focused mat class that targets deep stabilising muscles. Expect precise, controlled movements that improve posture, balance, and total-body coordination.',
    notes: 'Non-slip socks required. Please inform the instructor of any lower-back issues.',
    coachId: 'coach-2',
    capacity: 10,
    price: 130,
    duration: 60,
    calories: 260,
    level: 'All Levels',
  },
  {
    id: 'course-4',
    name: 'Postural Correction',
    type: 'pilates',
    description: 'Designed to address common postural imbalances caused by desk work and sedentary lifestyles. Includes targeted exercises to open the chest, strengthen the back, and align the spine.',
    notes: 'Wear fitted clothing so the instructor can observe alignment.',
    coachId: 'coach-2',
    capacity: 8,
    price: 160,
    duration: 60,
    calories: 200,
    level: 'Beginner',
  },
  {
    id: 'course-12',
    name: 'Reformer Pilates',
    type: 'pilates',
    description: 'Take your practice to the next level on the Reformer machine. This small-group class uses spring resistance to challenge every muscle group with precision and control.',
    notes: 'Grip socks required (available at reception). Max 6 students per class.',
    coachId: 'coach-2',
    capacity: 6,
    price: 200,
    duration: 55,
    calories: 280,
    level: 'Intermediate',
  },

  // ── Meditation ───────────────────────────────────────────
  {
    id: 'course-5',
    name: 'Mindfulness Meditation',
    type: 'meditation',
    description: 'A guided meditation session drawing on MBSR techniques. Cultivate present-moment awareness, reduce stress, and develop a sustainable daily practice.',
    notes: 'Cushions and blankets provided. No prior experience necessary.',
    coachId: 'coach-3',
    capacity: 20,
    price: 90,
    duration: 45,
    calories: 80,
    level: 'All Levels',
  },
  {
    id: 'course-6',
    name: 'Breathwork Workshop',
    type: 'meditation',
    description: 'Explore the transformative power of conscious breathing. Learn pranayama techniques and modern breathwork methods to regulate the nervous system and boost energy.',
    notes: 'Please avoid eating a heavy meal 2 hours before class.',
    coachId: 'coach-3',
    capacity: 15,
    price: 100,
    duration: 60,
    calories: 100,
    level: 'All Levels',
  },

  // ── Barre ────────────────────────────────────────────────
  {
    id: 'course-7',
    name: 'Barre Sculpt',
    type: 'barre',
    description: 'A full-body sculpting class inspired by ballet, Pilates, and yoga. Small isometric movements target the seat, thighs, and core to build long, lean muscle definition.',
    notes: 'Ballet socks or grip socks recommended. No dance experience required.',
    coachId: 'coach-4',
    capacity: 12,
    price: 140,
    duration: 55,
    calories: 310,
    level: 'All Levels',
  },
  {
    id: 'course-8',
    name: 'Barre Cardio Burn',
    type: 'barre',
    description: 'High-energy barre class combining ballet-inspired movements with cardio bursts for maximum calorie burn. Tone your whole body while having fun to upbeat music.',
    notes: 'Bring water and a towel. Non-slip socks required.',
    coachId: 'coach-4',
    capacity: 14,
    price: 130,
    duration: 50,
    calories: 360,
    level: 'Intermediate',
  },

  // ── HIIT ─────────────────────────────────────────────────
  {
    id: 'course-9',
    name: 'Power HIIT',
    type: 'hiit',
    description: 'High-intensity interval training that alternates between explosive functional movements and short recovery periods. Burns maximum calories and boosts your metabolism for hours post-class.',
    notes: 'Bring water and a towel. Athletic shoes required. Not suitable for those with joint injuries.',
    coachId: 'coach-5',
    capacity: 15,
    price: 150,
    duration: 45,
    calories: 490,
    level: 'Advanced',
  },
  {
    id: 'course-10',
    name: 'Core & Condition',
    type: 'hiit',
    description: 'A structured strength and conditioning class focused on building core stability and total-body power. Combines bodyweight circuits, resistance bands, and partner drills.',
    notes: 'All equipment provided. Supportive athletic footwear required.',
    coachId: 'coach-5',
    capacity: 12,
    price: 140,
    duration: 50,
    calories: 420,
    level: 'Intermediate',
  },
];

// ── Class Sessions (14 days: -7 to +7) ───────────────────
export const CLASS_SESSIONS: ClassSession[] = [
  // course-1 Morning Flow (Mon/Wed/Fri 07:30)
  { id: 'sess-1', courseId: 'course-1', coachId: 'coach-1', datetime: dateStr(-6, 7, 30), room: 'Studio A', status: 'completed' },
  { id: 'sess-2', courseId: 'course-1', coachId: 'coach-1', datetime: dateStr(-4, 7, 30), room: 'Studio A', status: 'completed' },
  { id: 'sess-3', courseId: 'course-1', coachId: 'coach-1', datetime: dateStr(-2, 7, 30), room: 'Studio A', status: 'completed' },
  { id: 'sess-4', courseId: 'course-1', coachId: 'coach-1', datetime: dateStr(1, 7, 30), room: 'Studio A', status: 'scheduled' },
  { id: 'sess-5', courseId: 'course-1', coachId: 'coach-1', datetime: dateStr(3, 7, 30), room: 'Studio A', status: 'scheduled' },
  { id: 'sess-6', courseId: 'course-1', coachId: 'coach-1', datetime: dateStr(5, 7, 30), room: 'Studio A', status: 'scheduled' },

  // course-2 Hatha Foundations (Tue/Thu 10:00)
  { id: 'sess-7', courseId: 'course-2', coachId: 'coach-1', datetime: dateStr(-5, 10), room: 'Studio B', status: 'completed' },
  { id: 'sess-8', courseId: 'course-2', coachId: 'coach-1', datetime: dateStr(-3, 10), room: 'Studio B', status: 'completed' },
  { id: 'sess-9', courseId: 'course-2', coachId: 'coach-1', datetime: dateStr(2, 10), room: 'Studio B', status: 'scheduled' },
  { id: 'sess-10', courseId: 'course-2', coachId: 'coach-1', datetime: dateStr(4, 10), room: 'Studio B', status: 'scheduled' },

  // course-3 Mat Pilates (Mon/Wed 14:00)
  { id: 'sess-11', courseId: 'course-3', coachId: 'coach-2', datetime: dateStr(-6, 14), room: 'Pilates Room', status: 'completed' },
  { id: 'sess-12', courseId: 'course-3', coachId: 'coach-2', datetime: dateStr(-4, 14), room: 'Pilates Room', status: 'completed' },
  { id: 'sess-13', courseId: 'course-3', coachId: 'coach-2', datetime: dateStr(1, 14), room: 'Pilates Room', status: 'scheduled' },
  { id: 'sess-14', courseId: 'course-3', coachId: 'coach-2', datetime: dateStr(3, 14), room: 'Pilates Room', status: 'scheduled' },

  // course-4 Postural Correction (Sat 10:00)
  { id: 'sess-15', courseId: 'course-4', coachId: 'coach-2', datetime: dateStr(-7, 10), room: 'Pilates Room', status: 'completed' },
  { id: 'sess-16', courseId: 'course-4', coachId: 'coach-2', datetime: dateStr(0, 10), room: 'Pilates Room', status: 'scheduled' },
  { id: 'sess-17', courseId: 'course-4', coachId: 'coach-2', datetime: dateStr(7, 10), room: 'Pilates Room', status: 'scheduled' },

  // course-5 Mindfulness Meditation (Tue/Thu 19:00)
  { id: 'sess-18', courseId: 'course-5', coachId: 'coach-3', datetime: dateStr(-5, 19), room: 'Zen Room', status: 'completed' },
  { id: 'sess-19', courseId: 'course-5', coachId: 'coach-3', datetime: dateStr(-3, 19), room: 'Zen Room', status: 'completed' },
  { id: 'sess-20', courseId: 'course-5', coachId: 'coach-3', datetime: dateStr(2, 19), room: 'Zen Room', status: 'scheduled' },
  { id: 'sess-21', courseId: 'course-5', coachId: 'coach-3', datetime: dateStr(4, 19), room: 'Zen Room', status: 'scheduled' },

  // course-6 Breathwork Workshop (Wed 18:00)
  { id: 'sess-22', courseId: 'course-6', coachId: 'coach-3', datetime: dateStr(-4, 18), room: 'Zen Room', status: 'completed' },
  { id: 'sess-23', courseId: 'course-6', coachId: 'coach-3', datetime: dateStr(3, 18), room: 'Zen Room', status: 'scheduled' },
  { id: 'sess-24', courseId: 'course-6', coachId: 'coach-3', datetime: dateStr(10, 18), room: 'Zen Room', status: 'scheduled' },

  // Extra sessions for variety
  { id: 'sess-25', courseId: 'course-1', coachId: 'coach-1', datetime: dateStr(0, 7, 30), room: 'Studio A', status: 'scheduled' },
  { id: 'sess-26', courseId: 'course-3', coachId: 'coach-2', datetime: dateStr(-1, 14), room: 'Pilates Room', status: 'completed' },
  { id: 'sess-27', courseId: 'course-2', coachId: 'coach-1', datetime: dateStr(6, 10), room: 'Studio B', status: 'scheduled' },
  { id: 'sess-28', courseId: 'course-5', coachId: 'coach-3', datetime: dateStr(6, 19), room: 'Zen Room', status: 'scheduled' },

  // course-11 Sunset Vinyasa (Mon/Thu 19:30)
  { id: 'sess-29', courseId: 'course-11', coachId: 'coach-1', datetime: dateStr(-6, 19, 30), room: 'Studio A', status: 'completed' },
  { id: 'sess-30', courseId: 'course-11', coachId: 'coach-1', datetime: dateStr(-3, 19, 30), room: 'Studio A', status: 'completed' },
  { id: 'sess-31', courseId: 'course-11', coachId: 'coach-1', datetime: dateStr(1, 19, 30), room: 'Studio A', status: 'scheduled' },
  { id: 'sess-32', courseId: 'course-11', coachId: 'coach-1', datetime: dateStr(4, 19, 30), room: 'Studio A', status: 'scheduled' },

  // course-12 Reformer Pilates (Tue/Sat 11:00)
  { id: 'sess-33', courseId: 'course-12', coachId: 'coach-2', datetime: dateStr(-5, 11), room: 'Reformer Studio', status: 'completed' },
  { id: 'sess-34', courseId: 'course-12', coachId: 'coach-2', datetime: dateStr(-1, 11), room: 'Reformer Studio', status: 'completed' },
  { id: 'sess-35', courseId: 'course-12', coachId: 'coach-2', datetime: dateStr(2, 11), room: 'Reformer Studio', status: 'scheduled' },
  { id: 'sess-36', courseId: 'course-12', coachId: 'coach-2', datetime: dateStr(6, 11), room: 'Reformer Studio', status: 'scheduled' },

  // course-7 Barre Sculpt (Mon/Wed/Fri 12:00)
  { id: 'sess-37', courseId: 'course-7', coachId: 'coach-4', datetime: dateStr(-6, 12), room: 'Dance Studio', status: 'completed' },
  { id: 'sess-38', courseId: 'course-7', coachId: 'coach-4', datetime: dateStr(-4, 12), room: 'Dance Studio', status: 'completed' },
  { id: 'sess-39', courseId: 'course-7', coachId: 'coach-4', datetime: dateStr(-2, 12), room: 'Dance Studio', status: 'completed' },
  { id: 'sess-40', courseId: 'course-7', coachId: 'coach-4', datetime: dateStr(1, 12), room: 'Dance Studio', status: 'scheduled' },
  { id: 'sess-41', courseId: 'course-7', coachId: 'coach-4', datetime: dateStr(3, 12), room: 'Dance Studio', status: 'scheduled' },
  { id: 'sess-42', courseId: 'course-7', coachId: 'coach-4', datetime: dateStr(5, 12), room: 'Dance Studio', status: 'scheduled' },

  // course-8 Barre Cardio Burn (Tue/Thu 18:00)
  { id: 'sess-43', courseId: 'course-8', coachId: 'coach-4', datetime: dateStr(-5, 18), room: 'Dance Studio', status: 'completed' },
  { id: 'sess-44', courseId: 'course-8', coachId: 'coach-4', datetime: dateStr(-3, 18), room: 'Dance Studio', status: 'completed' },
  { id: 'sess-45', courseId: 'course-8', coachId: 'coach-4', datetime: dateStr(2, 18), room: 'Dance Studio', status: 'scheduled' },
  { id: 'sess-46', courseId: 'course-8', coachId: 'coach-4', datetime: dateStr(4, 18), room: 'Dance Studio', status: 'scheduled' },

  // course-9 Power HIIT (Mon/Wed/Fri 08:00)
  { id: 'sess-47', courseId: 'course-9', coachId: 'coach-5', datetime: dateStr(-6, 8), room: 'Fitness Studio', status: 'completed' },
  { id: 'sess-48', courseId: 'course-9', coachId: 'coach-5', datetime: dateStr(-4, 8), room: 'Fitness Studio', status: 'completed' },
  { id: 'sess-49', courseId: 'course-9', coachId: 'coach-5', datetime: dateStr(-2, 8), room: 'Fitness Studio', status: 'completed' },
  { id: 'sess-50', courseId: 'course-9', coachId: 'coach-5', datetime: dateStr(1, 8), room: 'Fitness Studio', status: 'scheduled' },
  { id: 'sess-51', courseId: 'course-9', coachId: 'coach-5', datetime: dateStr(3, 8), room: 'Fitness Studio', status: 'scheduled' },
  { id: 'sess-52', courseId: 'course-9', coachId: 'coach-5', datetime: dateStr(5, 8), room: 'Fitness Studio', status: 'scheduled' },

  // course-10 Core & Condition (Tue/Thu 17:30)
  { id: 'sess-53', courseId: 'course-10', coachId: 'coach-5', datetime: dateStr(-5, 17, 30), room: 'Fitness Studio', status: 'completed' },
  { id: 'sess-54', courseId: 'course-10', coachId: 'coach-5', datetime: dateStr(-3, 17, 30), room: 'Fitness Studio', status: 'completed' },
  { id: 'sess-55', courseId: 'course-10', coachId: 'coach-5', datetime: dateStr(2, 17, 30), room: 'Fitness Studio', status: 'scheduled' },
  { id: 'sess-56', courseId: 'course-10', coachId: 'coach-5', datetime: dateStr(4, 17, 30), room: 'Fitness Studio', status: 'scheduled' },
];

// ── Bookings ──────────────────────────────────────────────
export const BOOKINGS: Booking[] = [
  { id: 'book-1', sessionId: 'sess-1', customerId: 'cust-1', status: 'attended', notes: '', createdAt: dateStr(-7) },
  { id: 'book-2', sessionId: 'sess-2', customerId: 'cust-1', status: 'attended', notes: '', createdAt: dateStr(-5) },
  { id: 'book-3', sessionId: 'sess-4', customerId: 'cust-1', status: 'confirmed', notes: 'Please reserve a spot near the front.', createdAt: dateStr(-1) },
  { id: 'book-4', sessionId: 'sess-5', customerId: 'cust-1', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-5', sessionId: 'sess-7', customerId: 'cust-2', status: 'attended', notes: '', createdAt: dateStr(-6) },
  { id: 'book-6', sessionId: 'sess-9', customerId: 'cust-2', status: 'confirmed', notes: '', createdAt: dateStr(-2) },
  { id: 'book-7', sessionId: 'sess-11', customerId: 'cust-3', status: 'attended', notes: '', createdAt: dateStr(-7) },
  { id: 'book-8', sessionId: 'sess-13', customerId: 'cust-3', status: 'confirmed', notes: 'Lower back rehabilitation, please advise.', createdAt: dateStr(-1) },
  { id: 'book-9', sessionId: 'sess-15', customerId: 'cust-4', status: 'attended', notes: '', createdAt: dateStr(-8) },
  { id: 'book-10', sessionId: 'sess-16', customerId: 'cust-4', status: 'confirmed', notes: '', createdAt: dateStr(-2) },
  { id: 'book-11', sessionId: 'sess-18', customerId: 'cust-5', status: 'attended', notes: '', createdAt: dateStr(-6) },
  { id: 'book-12', sessionId: 'sess-20', customerId: 'cust-5', status: 'confirmed', notes: '', createdAt: dateStr(-2) },
  { id: 'book-13', sessionId: 'sess-1', customerId: 'cust-6', status: 'attended', notes: '', createdAt: dateStr(-7) },
  { id: 'book-14', sessionId: 'sess-4', customerId: 'cust-6', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-15', sessionId: 'sess-11', customerId: 'cust-7', status: 'attended', notes: '', createdAt: dateStr(-7) },
  { id: 'book-16', sessionId: 'sess-13', customerId: 'cust-7', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-17', sessionId: 'sess-22', customerId: 'cust-8', status: 'attended', notes: '', createdAt: dateStr(-5) },
  { id: 'book-18', sessionId: 'sess-23', customerId: 'cust-8', status: 'confirmed', notes: '', createdAt: dateStr(-2) },
  { id: 'book-19', sessionId: 'sess-2', customerId: 'cust-9', status: 'absent', notes: '', createdAt: dateStr(-5) },
  { id: 'book-20', sessionId: 'sess-5', customerId: 'cust-9', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-21', sessionId: 'sess-8', customerId: 'cust-10', status: 'attended', notes: '', createdAt: dateStr(-4) },
  { id: 'book-22', sessionId: 'sess-10', customerId: 'cust-10', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-23', sessionId: 'sess-16', customerId: 'cust-2', status: 'confirmed', notes: '', createdAt: dateStr(-2) },
  { id: 'book-24', sessionId: 'sess-3', customerId: 'cust-3', status: 'cancelled', notes: '', createdAt: dateStr(-3) },
  { id: 'book-25', sessionId: 'sess-19', customerId: 'cust-1', status: 'attended', notes: '', createdAt: dateStr(-4) },
  // New bookings – Sunset Vinyasa
  { id: 'book-26', sessionId: 'sess-29', customerId: 'cust-6', status: 'attended', notes: '', createdAt: dateStr(-7) },
  { id: 'book-27', sessionId: 'sess-31', customerId: 'cust-6', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-28', sessionId: 'sess-30', customerId: 'cust-7', status: 'attended', notes: '', createdAt: dateStr(-4) },
  { id: 'book-29', sessionId: 'sess-32', customerId: 'cust-7', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  // New bookings – Reformer Pilates
  { id: 'book-30', sessionId: 'sess-33', customerId: 'cust-8', status: 'attended', notes: '', createdAt: dateStr(-6) },
  { id: 'book-31', sessionId: 'sess-35', customerId: 'cust-8', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-32', sessionId: 'sess-34', customerId: 'cust-9', status: 'attended', notes: '', createdAt: dateStr(-2) },
  { id: 'book-33', sessionId: 'sess-35', customerId: 'cust-10', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  // New bookings – Barre Sculpt
  { id: 'book-34', sessionId: 'sess-37', customerId: 'cust-1', status: 'attended', notes: '', createdAt: dateStr(-7) },
  { id: 'book-35', sessionId: 'sess-38', customerId: 'cust-1', status: 'attended', notes: '', createdAt: dateStr(-5) },
  { id: 'book-36', sessionId: 'sess-40', customerId: 'cust-1', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-37', sessionId: 'sess-39', customerId: 'cust-2', status: 'attended', notes: '', createdAt: dateStr(-3) },
  { id: 'book-38', sessionId: 'sess-41', customerId: 'cust-2', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-39', sessionId: 'sess-37', customerId: 'cust-4', status: 'attended', notes: '', createdAt: dateStr(-7) },
  { id: 'book-40', sessionId: 'sess-40', customerId: 'cust-4', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  // New bookings – Barre Cardio Burn
  { id: 'book-41', sessionId: 'sess-43', customerId: 'cust-3', status: 'attended', notes: '', createdAt: dateStr(-6) },
  { id: 'book-42', sessionId: 'sess-45', customerId: 'cust-3', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-43', sessionId: 'sess-44', customerId: 'cust-5', status: 'attended', notes: '', createdAt: dateStr(-4) },
  { id: 'book-44', sessionId: 'sess-46', customerId: 'cust-5', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  // New bookings – Power HIIT
  { id: 'book-45', sessionId: 'sess-47', customerId: 'cust-6', status: 'attended', notes: '', createdAt: dateStr(-7) },
  { id: 'book-46', sessionId: 'sess-48', customerId: 'cust-6', status: 'attended', notes: '', createdAt: dateStr(-5) },
  { id: 'book-47', sessionId: 'sess-50', customerId: 'cust-6', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-48', sessionId: 'sess-49', customerId: 'cust-9', status: 'attended', notes: '', createdAt: dateStr(-3) },
  { id: 'book-49', sessionId: 'sess-51', customerId: 'cust-9', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  // New bookings – Core & Condition
  { id: 'book-50', sessionId: 'sess-53', customerId: 'cust-10', status: 'attended', notes: '', createdAt: dateStr(-6) },
  { id: 'book-51', sessionId: 'sess-55', customerId: 'cust-10', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
  { id: 'book-52', sessionId: 'sess-54', customerId: 'cust-4', status: 'attended', notes: '', createdAt: dateStr(-4) },
  { id: 'book-53', sessionId: 'sess-56', customerId: 'cust-4', status: 'confirmed', notes: '', createdAt: dateStr(-1) },
];

// ── Attendances ───────────────────────────────────────────
export const ATTENDANCES: Attendance[] = [
  { bookingId: 'book-1', status: 'present', markedAt: dateStr(-6, 8) },
  { bookingId: 'book-2', status: 'present', markedAt: dateStr(-4, 8) },
  { bookingId: 'book-5', status: 'present', markedAt: dateStr(-5, 11) },
  { bookingId: 'book-7', status: 'present', markedAt: dateStr(-6, 15) },
  { bookingId: 'book-9', status: 'present', markedAt: dateStr(-7, 11) },
  { bookingId: 'book-11', status: 'present', markedAt: dateStr(-5, 20) },
  { bookingId: 'book-13', status: 'present', markedAt: dateStr(-6, 8) },
  { bookingId: 'book-15', status: 'present', markedAt: dateStr(-6, 15) },
  { bookingId: 'book-17', status: 'present', markedAt: dateStr(-4, 19) },
  { bookingId: 'book-19', status: 'absent', markedAt: dateStr(-4, 8) },
  { bookingId: 'book-21', status: 'present', markedAt: dateStr(-3, 11) },
  { bookingId: 'book-25', status: 'present', markedAt: dateStr(-3, 20) },
  { bookingId: 'book-3', status: 'pending' },
  { bookingId: 'book-4', status: 'pending' },
  // New attendances
  { bookingId: 'book-26', status: 'present', markedAt: dateStr(-6, 20) },
  { bookingId: 'book-28', status: 'present', markedAt: dateStr(-3, 20) },
  { bookingId: 'book-30', status: 'present', markedAt: dateStr(-5, 12) },
  { bookingId: 'book-32', status: 'present', markedAt: dateStr(-1, 12) },
  { bookingId: 'book-34', status: 'present', markedAt: dateStr(-6, 13) },
  { bookingId: 'book-35', status: 'present', markedAt: dateStr(-4, 13) },
  { bookingId: 'book-37', status: 'present', markedAt: dateStr(-2, 13) },
  { bookingId: 'book-39', status: 'present', markedAt: dateStr(-6, 13) },
  { bookingId: 'book-41', status: 'present', markedAt: dateStr(-5, 19) },
  { bookingId: 'book-43', status: 'present', markedAt: dateStr(-3, 19) },
  { bookingId: 'book-45', status: 'present', markedAt: dateStr(-6, 9) },
  { bookingId: 'book-46', status: 'present', markedAt: dateStr(-4, 9) },
  { bookingId: 'book-48', status: 'present', markedAt: dateStr(-2, 9) },
  { bookingId: 'book-50', status: 'present', markedAt: dateStr(-5, 18, 30) },
  { bookingId: 'book-52', status: 'present', markedAt: dateStr(-3, 18, 30) },
];

// ── Membership Cards ──────────────────────────────────────
export const MEMBERSHIP_CARDS: MembershipCard[] = [
  { id: 'card-1', customerId: 'cust-1', type: 'monthly', totalSessions: null, usedSessions: 8, price: 1200, expiry: dateStr(18), purchaseDate: dateStr(-12), isActive: true },
  { id: 'card-2', customerId: 'cust-2', type: 'sessions', totalSessions: 10, usedSessions: 3, price: 1100, expiry: dateStr(60), purchaseDate: dateStr(-30), isActive: true },
  { id: 'card-3', customerId: 'cust-3', type: 'annual', totalSessions: null, usedSessions: 24, price: 9800, expiry: dateStr(200), purchaseDate: dateStr(-165), isActive: true },
  { id: 'card-4', customerId: 'cust-4', type: 'sessions', totalSessions: 10, usedSessions: 8, price: 1100, expiry: dateStr(5), purchaseDate: dateStr(-85), isActive: true },
  { id: 'card-5', customerId: 'cust-5', type: 'monthly', totalSessions: null, usedSessions: 4, price: 1200, expiry: dateStr(20), purchaseDate: dateStr(-10), isActive: true },
  { id: 'card-6', customerId: 'cust-6', type: 'sessions', totalSessions: 20, usedSessions: 12, price: 2000, expiry: dateStr(45), purchaseDate: dateStr(-45), isActive: true },
  { id: 'card-7', customerId: 'cust-7', type: 'annual', totalSessions: null, usedSessions: 36, price: 9800, expiry: dateStr(180), purchaseDate: dateStr(-185), isActive: true },
  { id: 'card-8', customerId: 'cust-8', type: 'sessions', totalSessions: 10, usedSessions: 5, price: 1100, expiry: dateStr(40), purchaseDate: dateStr(-50), isActive: true },
  { id: 'card-9', customerId: 'cust-9', type: 'monthly', totalSessions: null, usedSessions: 2, price: 1200, expiry: dateStr(-2), purchaseDate: dateStr(-32), isActive: false },
  { id: 'card-10', customerId: 'cust-10', type: 'sessions', totalSessions: 20, usedSessions: 18, price: 2000, expiry: dateStr(10), purchaseDate: dateStr(-80), isActive: true },
];

// ── Orders ────────────────────────────────────────────────
export const ORDERS: Order[] = [
  { id: 'ord-1', customerId: 'cust-1', type: 'membership', amount: 1200, status: 'paid', description: 'Morning Flow – Monthly Pass', createdAt: dateStr(-12) },
  { id: 'ord-2', customerId: 'cust-2', type: 'membership', amount: 1100, status: 'paid', description: 'Session Pack – 10 Classes', createdAt: dateStr(-30) },
  { id: 'ord-3', customerId: 'cust-3', type: 'membership', amount: 9800, status: 'paid', description: 'Annual Unlimited Pass', createdAt: dateStr(-165) },
  { id: 'ord-4', customerId: 'cust-4', type: 'membership', amount: 1100, status: 'paid', description: 'Session Pack – 10 Classes', createdAt: dateStr(-85) },
  { id: 'ord-5', customerId: 'cust-5', type: 'membership', amount: 1200, status: 'paid', description: 'Monthly Pass', createdAt: dateStr(-10) },
  { id: 'ord-6', customerId: 'cust-6', type: 'membership', amount: 2000, status: 'paid', description: 'Session Pack – 20 Classes', createdAt: dateStr(-45) },
  { id: 'ord-7', customerId: 'cust-7', type: 'membership', amount: 9800, status: 'paid', description: 'Annual Unlimited Pass', createdAt: dateStr(-185) },
  { id: 'ord-8', customerId: 'cust-8', type: 'membership', amount: 1100, status: 'paid', description: 'Session Pack – 10 Classes', createdAt: dateStr(-50) },
  { id: 'ord-9', customerId: 'cust-9', type: 'membership', amount: 1200, status: 'refunded', description: 'Monthly Pass (refunded)', createdAt: dateStr(-32) },
  { id: 'ord-10', customerId: 'cust-10', type: 'membership', amount: 2000, status: 'paid', description: 'Session Pack – 20 Classes', createdAt: dateStr(-80) },
  { id: 'ord-11', customerId: 'cust-1', type: 'single_class', amount: 120, status: 'paid', description: 'Morning Flow – Drop-in', createdAt: dateStr(-3) },
  { id: 'ord-12', customerId: 'cust-2', type: 'single_class', amount: 110, status: 'paid', description: 'Hatha Foundations – Drop-in', createdAt: dateStr(-5) },
  { id: 'ord-13', customerId: 'cust-3', type: 'single_class', amount: 130, status: 'paid', description: 'Mat Pilates – Drop-in', createdAt: dateStr(-2) },
  { id: 'ord-14', customerId: 'cust-4', type: 'single_class', amount: 160, status: 'paid', description: 'Postural Correction – Drop-in', createdAt: dateStr(-4) },
  { id: 'ord-15', customerId: 'cust-5', type: 'private_lesson', amount: 400, status: 'paid', description: 'Private Session – Sarah Chen', createdAt: dateStr(-6) },
  { id: 'ord-16', customerId: 'cust-6', type: 'private_lesson', amount: 450, status: 'paid', description: 'Private Session – Maya Zhao', createdAt: dateStr(-7) },
  { id: 'ord-17', customerId: 'cust-7', type: 'single_class', amount: 90, status: 'paid', description: 'Mindfulness Meditation – Drop-in', createdAt: dateStr(-3) },
  { id: 'ord-18', customerId: 'cust-4', type: 'single_class', amount: 160, status: 'paid', description: 'Postural Correction – Drop-in', createdAt: dateStr(-1) },
  { id: 'ord-19', customerId: 'cust-1', type: 'single_class', amount: 140, status: 'paid', description: 'Barre Sculpt – Drop-in', createdAt: dateStr(-3) },
  { id: 'ord-20', customerId: 'cust-2', type: 'single_class', amount: 130, status: 'paid', description: 'Barre Cardio Burn – Drop-in', createdAt: dateStr(-2) },
  { id: 'ord-21', customerId: 'cust-6', type: 'single_class', amount: 150, status: 'paid', description: 'Power HIIT – Drop-in', createdAt: dateStr(-4) },
  { id: 'ord-22', customerId: 'cust-10', type: 'single_class', amount: 140, status: 'paid', description: 'Core & Condition – Drop-in', createdAt: dateStr(-2) },
  { id: 'ord-23', customerId: 'cust-5', type: 'private_lesson', amount: 420, status: 'paid', description: 'Private Session – Zoe Park', createdAt: dateStr(-2) },
  { id: 'ord-24', customerId: 'cust-6', type: 'private_lesson', amount: 480, status: 'paid', description: 'Private Session – Jordan Lee', createdAt: dateStr(-1) },
  { id: 'ord-25', customerId: 'cust-7', type: 'private_lesson', amount: 420, status: 'paid', description: 'Private Session – Zoe Park', createdAt: dateStr(-6) },
  { id: 'ord-26', customerId: 'cust-8', type: 'private_lesson', amount: 480, status: 'paid', description: 'Private Session – Jordan Lee', createdAt: dateStr(-5) },
  { id: 'ord-27', customerId: 'cust-3', type: 'single_class', amount: 200, status: 'paid', description: 'Reformer Pilates – Drop-in', createdAt: dateStr(-3) },
  { id: 'ord-28', customerId: 'cust-9', type: 'single_class', amount: 120, status: 'paid', description: 'Sunset Vinyasa – Drop-in', createdAt: dateStr(-2) },
];

// ── Private Lessons ───────────────────────────────────────
export const PRIVATE_LESSONS: PrivateLesson[] = [
  { id: 'pl-1', customerId: 'cust-1', coachId: 'coach-1', datetime: dateStr(2, 10), duration: 60, status: 'confirmed', notes: 'Would like to focus on backbend poses', price: 400, createdAt: dateStr(-1, 9) },
  { id: 'pl-2', customerId: 'cust-2', coachId: 'coach-2', datetime: dateStr(3, 14), duration: 60, status: 'pending', notes: 'Looking to improve posture and reduce slouching', price: 450, createdAt: dateStr(0, 10) },
  { id: 'pl-3', customerId: 'cust-1', coachId: 'coach-3', datetime: dateStr(-5, 14), duration: 60, status: 'completed', notes: 'High stress levels – need relaxation guidance', price: 350, createdAt: dateStr(-8, 9) },
  { id: 'pl-4', customerId: 'cust-3', coachId: 'coach-1', datetime: dateStr(1, 9), duration: 60, status: 'confirmed', notes: 'Postnatal recovery, core strength is limited', price: 400, createdAt: dateStr(-2, 10) },
  { id: 'pl-5', customerId: 'cust-4', coachId: 'coach-2', datetime: dateStr(4, 15, 30), duration: 60, status: 'pending', notes: '', price: 450, createdAt: dateStr(0, 11) },
  { id: 'pl-6', customerId: 'cust-2', coachId: 'coach-1', datetime: dateStr(-3, 9), duration: 60, status: 'completed', notes: '', price: 400, createdAt: dateStr(-5, 14) },
  { id: 'pl-7', customerId: 'cust-1', coachId: 'coach-2', datetime: dateStr(-1, 11), duration: 60, status: 'cancelled', notes: 'Change of plans', price: 450, createdAt: dateStr(-4, 10) },
  { id: 'pl-8', customerId: 'cust-5', coachId: 'coach-4', datetime: dateStr(2, 13), duration: 55, status: 'confirmed', notes: 'Preparing for a dance performance, need barre conditioning', price: 420, createdAt: dateStr(-1, 10) },
  { id: 'pl-9', customerId: 'cust-6', coachId: 'coach-5', datetime: dateStr(3, 9), duration: 60, status: 'pending', notes: 'Looking to build endurance for a marathon', price: 480, createdAt: dateStr(0, 8) },
  { id: 'pl-10', customerId: 'cust-7', coachId: 'coach-4', datetime: dateStr(-2, 12), duration: 55, status: 'completed', notes: 'Improve overall body toning', price: 420, createdAt: dateStr(-5, 9) },
  { id: 'pl-11', customerId: 'cust-8', coachId: 'coach-5', datetime: dateStr(-4, 8), duration: 60, status: 'completed', notes: 'HIIT programming for weight loss', price: 480, createdAt: dateStr(-7, 10) },
];

// ── Conversations ─────────────────────────────────────────
export const CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1', customerId: 'cust-1', participantId: 'admin-1', participantRole: 'admin',
    lastMessage: "We'd love to have you! Let us know if you have more questions.",
    lastMessageAt: dateStr(-1, 14), createdAt: dateStr(-3, 9),
  },
  {
    id: 'conv-2', customerId: 'cust-1', participantId: 'coach-1', participantRole: 'coach',
    lastMessage: "See you in class tomorrow! Remember to bring your mat.",
    lastMessageAt: dateStr(0, 10), createdAt: dateStr(-4, 11),
  },
  {
    id: 'conv-3', customerId: 'cust-2', participantId: 'admin-1', participantRole: 'admin',
    lastMessage: "The Postural Correction class is perfect for desk workers.",
    lastMessageAt: dateStr(-2, 15), createdAt: dateStr(-3, 14),
  },
  {
    id: 'conv-4', customerId: 'cust-3', participantId: 'coach-2', participantRole: 'coach',
    lastMessage: "Great progress today! Keep working on your core.",
    lastMessageAt: dateStr(-1, 16), createdAt: dateStr(-5, 10),
  },
  {
    id: 'conv-5', customerId: 'cust-5', participantId: 'admin-1', participantRole: 'admin',
    lastMessage: "Sure, your membership is valid until next month.",
    lastMessageAt: dateStr(-3, 11), createdAt: dateStr(-4, 9),
  },
];

// ── Messages ──────────────────────────────────────────────
export const MESSAGES: Message[] = [
  // conv-1: Emily ↔ Admin
  { id: 'msg-1', conversationId: 'conv-1', senderId: 'cust-1', text: "Hi! I'm interested in joining a yoga class. Which one would you recommend for a beginner?", createdAt: dateStr(-3, 9), read: true },
  { id: 'msg-2', conversationId: 'conv-1', senderId: 'admin-1', text: "Welcome Emily! I'd recommend starting with Hatha Foundations — it's perfect for beginners and focuses on proper alignment.", createdAt: dateStr(-3, 9, 30), read: true },
  { id: 'msg-3', conversationId: 'conv-1', senderId: 'cust-1', text: "That sounds great! How many classes are included in the monthly pass?", createdAt: dateStr(-2, 13), read: true },
  { id: 'msg-4', conversationId: 'conv-1', senderId: 'admin-1', text: "The monthly pass gives you unlimited access to all group classes! That's great value if you're planning to come 3+ times a week.", createdAt: dateStr(-2, 13, 30), read: true },
  { id: 'msg-5', conversationId: 'conv-1', senderId: 'cust-1', text: "Perfect! Can I also book private sessions with the monthly pass?", createdAt: dateStr(-1, 11), read: true },
  { id: 'msg-6', conversationId: 'conv-1', senderId: 'admin-1', text: "We'd love to have you! Let us know if you have more questions.", createdAt: dateStr(-1, 14), read: false },

  // conv-2: Emily ↔ Coach Sarah
  { id: 'msg-7', conversationId: 'conv-2', senderId: 'cust-1', text: "Hi Sarah, I wanted to ask — is the Morning Flow class okay for someone with mild knee issues?", createdAt: dateStr(-4, 11), read: true },
  { id: 'msg-8', conversationId: 'conv-2', senderId: 'coach-1', text: "Hi Emily! Yes, absolutely. We have modifications for every pose. Just let me know before class and I'll keep an eye on you.", createdAt: dateStr(-4, 11, 30), read: true },
  { id: 'msg-9', conversationId: 'conv-2', senderId: 'cust-1', text: "Thank you so much! I felt much better after yesterday's class.", createdAt: dateStr(-1, 18), read: true },
  { id: 'msg-10', conversationId: 'conv-2', senderId: 'coach-1', text: "See you in class tomorrow! Remember to bring your mat.", createdAt: dateStr(0, 10), read: false },

  // conv-3: Jessica ↔ Admin
  { id: 'msg-11', conversationId: 'conv-3', senderId: 'cust-2', text: "I've been having bad posture from sitting at a desk all day. Do you have classes that could help?", createdAt: dateStr(-3, 14), read: true },
  { id: 'msg-12', conversationId: 'conv-3', senderId: 'admin-1', text: "The Postural Correction class is perfect for desk workers.", createdAt: dateStr(-2, 15), read: true },

  // conv-4: Lily ↔ Coach Maya
  { id: 'msg-13', conversationId: 'conv-4', senderId: 'cust-3', text: "Maya, I really felt the difference after today's session. My lower back feels so much better!", createdAt: dateStr(-2, 15), read: true },
  { id: 'msg-14', conversationId: 'conv-4', senderId: 'coach-2', text: "That's wonderful to hear! The key is consistency. Keep doing the exercises I showed you at home.", createdAt: dateStr(-2, 16), read: true },
  { id: 'msg-15', conversationId: 'conv-4', senderId: 'cust-3', text: "Will do! See you next week.", createdAt: dateStr(-1, 9), read: true },
  { id: 'msg-16', conversationId: 'conv-4', senderId: 'coach-2', text: "Great progress today! Keep working on your core.", createdAt: dateStr(-1, 16), read: false },

  // conv-5: Mia ↔ Admin
  { id: 'msg-17', conversationId: 'conv-5', senderId: 'cust-5', text: "Hi, I wanted to check when my membership expires?", createdAt: dateStr(-4, 9), read: true },
  { id: 'msg-18', conversationId: 'conv-5', senderId: 'admin-1', text: "Sure, your membership is valid until next month.", createdAt: dateStr(-3, 11), read: true },
];
