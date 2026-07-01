import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Phone, Clock, Bell, ShieldCheck } from 'lucide-react';
import type { Studio } from '@/lib/types';

export default function AdminSettingsPage() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [form, setForm] = useState<Studio>({ ...state.studio });

  const handleSave = () => {
    dispatch({ type: 'UPDATE_STUDIO', payload: form });
    toast({ title: 'Studio settings saved' });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="font-serif text-2xl font-semibold text-foreground mb-1">Studio Settings</h1>
      <p className="text-muted-foreground text-sm mb-6">Manage your studio's profile and policies</p>

      <div className="space-y-5">
        {/* Basic info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-medium text-foreground mb-3">Basic Information</h2>
            <div className="space-y-1.5">
              <Label>Studio Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="e.g. Move. Breathe. Transform." />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Operating Hours</Label>
              <Input value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} placeholder="e.g. Mon–Sat 7:00–21:00" />
            </div>
          </CardContent>
        </Card>

        {/* Policy */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-medium text-foreground flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Cancellation Policy</h2>
            <div className="space-y-1.5">
              <Label>Advance Notice Required (hours)</Label>
              <Input
                type="number"
                value={form.cancelPolicy}
                onChange={e => setForm(f => ({ ...f, cancelPolicy: e.target.value }))}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Members must cancel at least this many hours before class.</p>
            </div>
          </CardContent>
        </Card>

        {/* Announcement */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-medium text-foreground flex items-center gap-2"><Bell className="w-4 h-4" />Announcement Banner</h2>
            <div className="space-y-1.5">
              <Label>Message (shown on customer homepage)</Label>
              <Textarea
                rows={3}
                value={form.announcement}
                onChange={e => setForm(f => ({ ...f, announcement: e.target.value }))}
                placeholder="Leave empty to hide the banner"
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <Button className="w-full h-11" onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}
