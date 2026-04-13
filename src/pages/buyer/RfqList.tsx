import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function RfqList() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: rfqs = [], isLoading } = useQuery({
    queryKey: ['buyer-all-rfqs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('rfqs')
        .select('id, title, status, needed_by, created_at, description')
        .eq('buyer_company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Запросы на КП (RFQ)</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{rfqs.length} запросов</p>
          </div>
          <Button className="gap-2 text-xs"><Plus className="h-3.5 w-3.5" /> Новый запрос</Button>
        </div>

        <div className="card-panel">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : rfqs.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Нет запросов</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="table-header p-4 text-left">Запрос</th>
                  <th className="table-header p-4 text-center">Статус</th>
                  <th className="table-header p-4 text-left">Создан</th>
                  <th className="table-header p-4 text-left">Дедлайн</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="p-4">
                      <Link to={`/buyer/rfq/${r.id}`} className="font-medium text-foreground hover:text-primary transition-colors">{r.title}</Link>
                    </td>
                    <td className="p-4 text-center"><StatusBadge status={r.status} /></td>
                    <td className="p-4 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="p-4 text-xs text-muted-foreground">{fmtDate(r.needed_by)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
