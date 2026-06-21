import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getDefaultRouteForRole } from '@/lib/app-utils';
import type { AppRole, CompanyType, Profile } from '@/types/app';

function getRoleFromMetadata(profile: Profile | null, metadataRole: unknown): AppRole {
  if (profile?.role) {
    return profile.role;
  }

  if (metadataRole === 'supplier' || metadataRole === 'manager' || metadataRole === 'admin') {
    return metadataRole;
  }

  return 'buyer';
}

function getCompanyType(role: AppRole): CompanyType {
  return role === 'supplier' ? 'supplier' : 'buyer';
}

export default function SetupWorkspace() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<AppRole>('buyer');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const metadata = user.user_metadata ?? {};

    setFullName(profile?.full_name ?? metadata.full_name ?? '');
    setCompanyName(metadata.company_name ?? '');
    setRole(getRoleFromMetadata(profile, metadata.role));
  }, [profile, user]);

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!loading && profile?.company_id) {
    return <Navigate to={getDefaultRouteForRole(profile.role)} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSubmitting(true);

    const normalizedCompanyName = companyName.trim();
    const normalizedFullName = fullName.trim();

    if (!normalizedCompanyName) {
      toast({
        title: 'Нужно указать компанию',
        description: 'Без компании кабинет не сможет загрузить рабочие данные.',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: normalizedCompanyName,
        legal_name: normalizedCompanyName,
        email: user.email ?? null,
        type: getCompanyType(role),
      })
      .select('id')
      .single();

    if (companyError || !company) {
      const companyErrorMessage = companyError?.message ?? 'Проверьте RLS policy для companies.';
      const isRlsInsertProblem =
        companyErrorMessage.toLowerCase().includes('row-level security') ||
        companyErrorMessage.toLowerCase().includes('violates row-level security');

      toast({
        title: 'Не удалось создать компанию',
        description: isRlsInsertProblem
          ? 'На удалённом Supabase ещё не применена migration с INSERT policy для companies.'
          : companyErrorMessage,
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    const profilePayload = {
      id: user.id,
      full_name: normalizedFullName || user.email || null,
      role,
      company_id: company.id,
      is_active: true,
    };

    const profileMutation = profile
      ? supabase.from('profiles').update(profilePayload).eq('id', user.id)
      : supabase.from('profiles').insert(profilePayload);

    const { error: profileError } = await profileMutation;

    if (profileError) {
      toast({
        title: 'Не удалось сохранить профиль',
        description: profileError.message,
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    await refreshProfile();

    toast({
      title: 'Рабочее пространство готово',
      description: 'Профиль и компания созданы.',
    });

    navigate(getDefaultRouteForRole(role), { replace: true });
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">EcaMarket setup</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Завершение настройки аккаунта</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Создаём рабочее пространство: профиль пользователя и компанию.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="setup-name" className="text-xs">ФИО</Label>
            <Input
              id="setup-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Иванов Алексей"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Роль</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  role === 'buyer'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input text-muted-foreground hover:bg-accent'
                }`}
              >
                Покупатель
              </button>
              <button
                type="button"
                onClick={() => setRole('supplier')}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  role === 'supplier'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input text-muted-foreground hover:bg-accent'
                }`}
              >
                Поставщик
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="setup-company" className="text-xs">Компания</Label>
            <Input
              id="setup-company"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="ООО Ромашка"
              required
            />
          </div>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          Компания создаётся как рабочее пространство и привязывается к вашему аккаунту.
        </div>

        <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
          Если при сохранении появляется ошибка про `row-level security` для `companies`, нужно применить актуальные
          миграции Supabase на удалённом проекте.
        </div>

          <Button className="w-full gap-2" type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Сохранить и открыть кабинет
          </Button>
        </form>
      </div>
    </div>
  );
}
