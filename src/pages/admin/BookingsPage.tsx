import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CourseTypeBadge, BookingStatusBadge, formatDateTime } from '@/components/shared/badges';
import { Search } from 'lucide-react';
import type { BookingStatus } from '@/lib/types';

export default function AdminBookingsPage() {
  const { state, getCourse, getSession, getUser } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');

  const allBookings = state.bookings
    .map(b => {
      const session = getSession(b.sessionId);
      const course = session ? getCourse(session.courseId) : undefined;
      const customer = getUser(b.customerId);
      const coach = session ? getUser(session.coachId) : undefined;
      return { ...b, session, course, customer, coach };
    })
    .filter(b => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchSearch = !search || b.customer?.name.toLowerCase().includes(search.toLowerCase()) || b.course?.name.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-serif text-2xl font-semibold text-foreground mb-1">Bookings</h1>
      <p className="text-muted-foreground text-sm mb-6">All class booking records</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search member or class..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as BookingStatus | 'all')}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="attended">Attended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allBookings.map(b => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.customer?.name ?? '—'}</TableCell>
                <TableCell>
                  {b.course ? (
                    <div className="flex items-center gap-2">
                      <CourseTypeBadge type={b.course.type} />
                      <span className="text-sm">{b.course.name}</span>
                    </div>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.coach?.name ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.session ? formatDateTime(b.session.datetime) : '—'}</TableCell>
                <TableCell><BookingStatusBadge status={b.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {allBookings.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">No bookings found.</div>
      )}
    </div>
  );
}
