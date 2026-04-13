import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  legal_name: string | null;
  legal_address: string | null;
  actual_address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

export default function CompanySettings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const mode = profile?.role === 'supplier' ? 'supplier' : 'buyer';

  useEffect(() => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }
    supabase
      .from('companies')
      .select('id, name, inn, kpp, ogrn, legal_name, legal_address, actual_address, phone, email, website')
      .eq('id', profile.company_id)
      .single()
      .then(({ data }) => {
        if (data) setCompany(data as Company);
        setLoading(false);
      });
  }, [profile?.company_id]);

  const update = (field: keyof Company, value: string) => {
    if (company) setCompany({ ...company, [field]: value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    const { error } = await supabase
      .from('companies')
      .update({
        name: company.name,
        inn: company.inn,
        kpp: company.kpp,
        ogrn: company.ogrn,
        legal_name: company.legal_name,
        legal_address: company.legal_address,
        actual_address: company.actual_address,
        phone: company.phone,
        email: company.email,
        website: company.website,
      })
      .eq('id', company.id);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Компания обновлена' });
    }
    setSaving(false);
  };

  return (
    <DashboardLayout mode={mode}>
      <div className="max-w-lg">
        <h1 className="text-lg font-bold text-foreground">Настройки компании</h1>
        <p className="mt-1 text-xs text-muted-foreground">Реквизиты и контактные данные</p>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !company ? (
          <div className="mt-8 rounded-md border bg-muted/50 p-4 text-xs text-muted-foreground">
            Компания не привязана к вашему профилю. Обратитесь к администратору.
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            {([
              ['name', 'Название'],
              ['legal_name', 'Юридическое наименование'],
              ['inn', 'ИНН'],
              ['kpp', 'КПП'],
              ['ogrn', 'ОГРН'],
              ['legal_address', 'Юридический адрес'],
              ['actual_address', 'Фактический адрес'],
              ['phone', 'Телефон'],
              ['email', 'Email'],
              ['website', 'Сайт'],
            ] as [keyof Company, string][]).map(([field, label]) => (
              <div key={field} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input
                  value={company[field] ?? ''}
                  onChange={e => update(field, e.target.value)}
                  className="text-xs"
                />
              </div>
            ))}
            <Button type="submit" className="text-xs h-9" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
