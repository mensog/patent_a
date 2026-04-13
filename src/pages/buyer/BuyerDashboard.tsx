import { DashboardLayout } from '@/components/DashboardLayout';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { KPI } from '@/data/mock';

export default function BuyerDashboard() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: rfqs = [], isLoading: rfqsLoading } = useQuery({
    queryKey: ['buyer-rfqs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('rfqs')
        .select('id, title, status, needed_by, created_at')
        .eq('buyer_company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['buyer-orders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, payment_status, total_amount, created_at, supplier_company_id, companies!orders_supplier_company_id_fkey(name)')
        .eq('buyer_company_id', companyId)
        .in('status', ['confirmed', 'in_progress', 'shipped'])
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: company } = useQuery({
    queryKey: ['my-company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from('companies').select('name, inn').eq('id', companyId).single();
      return data;
    },
    enabled: !!companyId,
  });

  const activeRfqs = rfqs.filter(r => r.status !== 'closed' && r.status !== 'cancelled');
  const kpis: KPI[] = [
    { label: 'Активные запросы', value: String(activeRfqs.length), changeType: 'neutral' },
    { label: 'Заказы в работе', value: String(orders.length), changeType: 'neutral' },
  ];

  const loading = rfqsLoading || ordersLoading;
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Обзор закупок</h1>
          {company && <p className="mt-0.5 text-sm text-muted-foreground">{company.name}{company.inn ? ` · ИНН ${company.inn}` : ''}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {kpis.map((k, i) => <KPICard key={i} kpi={k} />)}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Active RFQs */}
          <div className="col-span-2 card-panel">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <h3 className="section-title">Активные запросы</h3>
              <Link to="/buyer/rfq" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Все запросы <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-5 pb-5 pt-3">
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка…</p>
              ) : rfqs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет запросов</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="table-header pb-3 text-left">Запрос</th>
                      <th className="table-header pb-3 text-left">Статус</th>
                      <th className="table-header pb-3 text-right">Дедлайн</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqs.map(r => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-3">
                          <Link to={`/buyer/rfq/${r.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{r.title}</Link>
                        </td>
                        <td className="py-3"><StatusBadge status={r.status} /></td>
                        <td className="py-3 text-right text-xs text-muted-foreground">{fmtDate(r.needed_by)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Orders in progress */}
          <div className="card-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Заказы в работе</h3>
              <span className="text-[11px] text-muted-foreground">{orders.length} активн.</span>
            </div>
            {ordersLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Загрузка…</p>
            ) : orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Нет заказов</p>
            ) : (
              <div className="space-y-2">
                {orders.map(o => (
                  <Link key={o.id} to={`/buyer/orders/${o.id}`} className="flex items-center justify-between rounded-md border p-3.5 hover:bg-muted/40 transition-colors group">
                    <div>
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        Заказ {o.order_number ? `#${o.order_number}` : ''}
                      </span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {(o as any).companies?.name ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">{Number(o.total_amount).toLocaleString('ru-RU')} ₽</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
