import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/app-utils';
import type { SupplierRfqListItem } from '@/types/app';

export default function SupplierRfqList() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: rfqs = [], isLoading, error } = useQuery({
    queryKey: ['supplier-rfq-list', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data: invites, error: invitesError } = await supabase
        .from('rfq_suppliers')
        .select('rfq_id')
        .eq('supplier_company_id', companyId);

      if (invitesError) {
        throw invitesError;
      }

      if (!invites?.length) {
        return [];
      }

      const { data, error: queryError } = await supabase
        .from('rfqs')
        .select('id, title, status, needed_by, created_at, buyer_company_id, description, companies!rfqs_buyer_company_id_fkey(name)')
        .in('id', invites.map((item) => item.rfq_id))
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      return (data ?? []) as SupplierRfqListItem[];
    },
    enabled: !!companyId,
  });

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Приглашения в RFQ</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{rfqs.length} запросов</p>
        </div>

        <div className="card-panel">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : error ? (
            <p className="py-16 text-center text-sm text-destructive">Не удалось загрузить список RFQ.</p>
          ) : rfqs.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Приглашений пока нет</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="table-header px-5 py-3 text-left">Запрос</th>
                  <th className="table-header px-5 py-3 text-left">Покупатель</th>
                  <th className="table-header px-5 py-3 text-center">Статус</th>
                  <th className="table-header px-5 py-3 text-right">Нужно к</th>
                  <th className="table-header px-5 py-3 text-right">Создан</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => (
                  <tr key={rfq.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/supplier/rfq/${rfq.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {rfq.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{rfq.companies?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={rfq.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground">{formatDate(rfq.needed_by)}</td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground">{formatDate(rfq.created_at)}</td>
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
