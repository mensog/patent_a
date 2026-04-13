import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const mode = profile?.role === 'supplier' ? 'supplier' : 'buyer';

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', profile.id);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Профиль обновлён' });
      await refreshProfile();
    }
    setSaving(false);
  };

  return (
    <DashboardLayout mode={mode}>
      <div className="max-w-lg">
        <h1 className="text-lg font-bold text-foreground">Настройки профиля</h1>
        <p className="mt-1 text-xs text-muted-foreground">Управление личными данными</p>
        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={user?.email ?? '—'} disabled className="text-xs bg-muted" />
            <p className="text-[11px] text-muted-foreground">Email нельзя изменить</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ФИО</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Телефон</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="text-xs" placeholder="+7 (999) 123-45-67" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Роль</Label>
            <Input value={profile?.role ?? ''} disabled className="text-xs bg-muted" />
          </div>
          <Button type="submit" className="text-xs h-9" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
