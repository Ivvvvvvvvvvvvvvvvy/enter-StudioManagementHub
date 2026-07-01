import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusBadge, formatDate, formatCurrency, getOrderTypeLabel } from '@/components/shared/badges';
import { TrendingUp, Search } from 'lucide-react';
import type { OrderStatus, OrderType } from '@/lib/types';

export default function AdminOrdersPage() {
  const { state, getUser } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>('all');

  const filtered = state.orders
    .filter(o => {
      const customer = getUser(o.customerId);
      const matchSearch = !search || customer?.name.toLowerCase().includes(search.toLowerCase()) || o.description.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchType = typeFilter === 'all' || o.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalRevenue = state.orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.amount, 0);
  const totalRefunded = state.orders.filter(o => o.status === 'refunded').reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-serif text-2xl font-semibold text-foreground mb-1">Orders & Revenue</h1>
      <p className="text-muted-foreground text-sm mb-5">Track all transactions and revenue</p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'text-primary' },
          { label: 'Total Orders', value: state.orders.length, color: 'text-foreground' },
          { label: 'Refunded', value: formatCurrency(totalRefunded), color: 'text-destructive' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-muted-foreground" /></div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search member or order..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as OrderStatus | 'all')}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as OrderType | 'all')}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="membership">Membership</SelectItem>
            <SelectItem value="single_class">Drop-in</SelectItem>
            <SelectItem value="private_lesson">Private Session</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(o => {
              const customer = getUser(o.customerId);
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{customer?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.description}</TableCell>
                  <TableCell className="text-sm">{getOrderTypeLabel(o.type)}</TableCell>
                  <TableCell className="font-medium text-foreground">{formatCurrency(o.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                  <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground text-sm">No orders found.</div>}
    </div>
  );
}
