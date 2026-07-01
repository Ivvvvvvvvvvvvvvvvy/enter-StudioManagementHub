import { ProtectedRoute } from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import CustomerHomePage from './pages/customer/HomePage';
import CourseListPage from './pages/customer/CourseListPage';
import CourseDetailPage from './pages/customer/CourseDetailPage';
import BookingPage from './pages/customer/BookingPage';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import PrivateLessonsPage from './pages/customer/PrivateLessonsPage';
import HealthProfilePage from './pages/customer/HealthProfilePage';
import RenewalPage from './pages/customer/RenewalPage';
import CoachProfilePage from './pages/customer/CoachProfilePage';
import CoachSchedulePage from './pages/coach/SchedulePage';
import CoachClassDetailPage from './pages/coach/ClassDetailPage';
import CoachPrivateLessonsPage from './pages/coach/PrivateLessonsPage';
import AdminDashboardPage from './pages/admin/DashboardPage';
import AIAnalystPage from './pages/admin/AIAnalystPage';
import AdminCoursesPage from './pages/admin/CoursesPage';
import AdminCalendarPage from './pages/admin/CalendarPage';
import AdminBookingsPage from './pages/admin/BookingsPage';
import AdminMembersPage from './pages/admin/MembersPage';
import MemberDetailPage from './pages/admin/MemberDetailPage';
import AdminOrdersPage from './pages/admin/OrdersPage';
import AdminSettingsPage from './pages/admin/SettingsPage';
import MessagesPage from './pages/MessagesPage';
import NotFound from './pages/NotFound';

export const routers = [
  { path: '/login', name: 'login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      // Customer
      { path: '/', name: 'home', element: <CustomerHomePage /> },
      { path: '/courses', name: 'courses', element: <CourseListPage /> },
      { path: '/courses/:id', name: 'course-detail', element: <CourseDetailPage /> },
      { path: '/booking/:sessionId', name: 'booking', element: <BookingPage /> },
      { path: '/my-bookings', name: 'my-bookings', element: <MyBookingsPage /> },
      { path: '/private', name: 'private-lessons', element: <PrivateLessonsPage /> },
      { path: '/health-profile', name: 'health-profile', element: <HealthProfilePage /> },
      { path: '/renewal', name: 'renewal', element: <RenewalPage /> },
      { path: '/coaches/:coachId', name: 'coach-profile', element: <CoachProfilePage /> },
      { path: '/messages', name: 'messages', element: <MessagesPage /> },
      // Coach
      { path: '/coach', name: 'coach', element: <CoachSchedulePage /> },
      { path: '/coach/class/:id', name: 'coach-class', element: <CoachClassDetailPage /> },
      { path: '/coach/private', name: 'coach-private', element: <CoachPrivateLessonsPage /> },
      // Admin
      { path: '/admin', name: 'admin', element: <AdminDashboardPage /> },
      { path: '/admin/ai-analyst', name: 'admin-ai-analyst', element: <AIAnalystPage /> },
      { path: '/admin/courses', name: 'admin-courses', element: <AdminCoursesPage /> },
      { path: '/admin/calendar', name: 'admin-calendar', element: <AdminCalendarPage /> },
      { path: '/admin/bookings', name: 'admin-bookings', element: <AdminBookingsPage /> },
      { path: '/admin/members', name: 'admin-members', element: <AdminMembersPage /> },
      { path: '/admin/members/:id', name: 'admin-member-detail', element: <MemberDetailPage /> },
      { path: '/admin/orders', name: 'admin-orders', element: <AdminOrdersPage /> },
      { path: '/admin/settings', name: 'admin-settings', element: <AdminSettingsPage /> },
      { path: '/admin/messages', name: 'admin-messages', element: <MessagesPage /> },
    ],
  },
  { path: '*', name: '404', element: <NotFound /> },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
