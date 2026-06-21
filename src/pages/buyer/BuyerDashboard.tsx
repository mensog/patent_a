import { DashboardLayout } from '@/components/DashboardLayout';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/app-utils';
import type { KPI } from '@/data/mock';
import type { BuyerOrderListItem, CompanyPreview } from '@/types/app';

const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];

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
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as BuyerOrderListItem[];
    },
    enabled: !!companyId,
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['buyer-dashboard-shipments', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('shipments')
        .select('id, shipment_number, status, planned_date, orders!inner(buyer_company_id)')
        .eq('orders.buyer_company_id', companyId)
        .order('planned_date', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: company } = useQuery({
    queryKey: ['my-company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.from('companies').select('id, name, inn, type').eq('id', companyId).single();
      if (error) throw error;
      return data as CompanyPreview;
    },
    enabled: !!companyId,
  });

  const activeRfqs = rfqs.filter(r => r.status !== 'closed' && r.status !== 'cancelled');
  const activeOrders = orders.filter(o => ['confirmed', 'in_progress', 'shipped'].includes(o.status));
  const waitingQuotes = rfqs.filter(r => r.status === 'published').length;
  const nearestShipment = shipments.find((shipment) => shipment.planned_date && shipment.status !== 'delivered');
  const activeOrdersAmount = activeOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
  const maxMonthlyAmount = Math.max(...monthLabels.map((_, index) => {
    const monthIndex = index;
    return orders
      .filter(order => new Date(order.created_at).getMonth() === monthIndex)
      .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
  }), 1);
  const monthlyBars = monthLabels.map((label, index) => {
    const amount = orders
      .filter(order => new Date(order.created_at).getMonth() === index)
      .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
    return { label, amount, height: Math.max(10, Math.round((amount / maxMonthlyAmount) * 100)) };
  });
  const events = [
    ...rfqs.slice(0, 3).map((rfq) => ({
      id: `rfq-${rfq.id}`,
      text: `Запрос «${rfq.title}» обновлён`,
      time: formatDate(rfq.created_at),
      href: `/buyer/rfq/${rfq.id}`,
    })),
    ...orders.slice(0, 3).map((order) => ({
      id: `order-${order.id}`,
      text: `Заказ ${order.order_number ? `#${order.order_number}` : order.id.slice(0, 8)} — статус ${order.status}`,
      time: formatDate(order.created_at),
      href: `/buyer/orders/${order.id}`,
    })),
  ].slice(0, 4);
  const kpis: KPI[] = [
    { label: 'Активные RFQ', value: String(activeRfqs.length), change: '+ за неделю', changeType: 'positive' },
    { label: 'Ожидают КП', value: String(waitingQuotes), change: waitingQuotes ? 'требуют ответа' : 'нет просрочек', changeType: waitingQuotes ? 'negative' : 'neutral' },
    { label: 'Заказы в работе', value: String(activeOrders.length), change: `На ${formatCurrency(activeOrdersAmount)}`, changeType: 'neutral' },
    { label: 'Ближайшая поставка', value: nearestShipment?.planned_date ? formatDate(nearestShipment.planned_date) : '—', change: nearestShipment?.shipment_number ?? 'нет планов', changeType: 'neutral' },
  ];

  const loading = rfqsLoading || ordersLoading;

  return (
    <DashboardLayout mode="buyer">
      <div className="demo-page">
        <div>
          <h1 className="page-title">Дашборд покупателя</h1>
          {company && <p className="mt-0.5 text-sm text-muted-foreground">{company.name}{company.inn ? ` · ИНН ${company.inn}` : ''}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, i) => <KPICard key={i} kpi={k} />)}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Active RFQs */}
          <div className="col-span-2 card-panel">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <h3 className="section-title">Последние запросы (RFQ)</h3>
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
                      <th className="table-header pb-3 text-left">Название</th>
                      <th className="table-header pb-3 text-center">Статус</th>
                      <th className="table-header pb-3 text-right">Дедлайн</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqs.map(r => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-3">
                          <Link to={`/buyer/rfq/${r.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{r.title}</Link>
                        </td>
                        <td className="py-3 text-center"><StatusBadge status={r.status} /></td>
                        <td className="py-3 text-right text-xs text-muted-foreground">{formatDate(r.needed_by)}</td>
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
              <h3 className="section-title">Последние события</h3>
            </div>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
            ) : events.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Нет событий</p>
            ) : (
              <div className="space-y-4">
                {events.map(event => (
                  <Link key={event.id} to={event.href} className="flex gap-3 text-sm group">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <span>
                      <span className="block font-medium leading-snug group-hover:text-primary">{event.text}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{event.time}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="card-panel p-5">
            <h3 className="section-title mb-5">Активные заказы</h3>
            {ordersLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Загрузка...</p>
            ) : activeOrders.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Нет активных заказов</p>
            ) : (
              <div className="space-y-3">
                {activeOrders.slice(0, 4).map(o => (
                  <Link key={o.id} to={`/buyer/orders/${o.id}`} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/40">
                    <div>
                      <span className="font-semibold">Заказ {o.order_number ? `#${o.order_number}` : o.id.slice(0, 8)}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{o.companies?.name ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums">{formatCurrency(o.total_amount)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card-panel p-5">
            <h3 className="section-title mb-5">Объём закупок (тыс. ₽)</h3>
            <div className="flex h-44 items-end gap-4 border-b border-l px-5 pb-3">
              {monthlyBars.map(bar => (
                <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full max-w-12 rounded-t-md bg-primary"
                    style={{ height: `${bar.height}%` }}
                    title={formatCurrency(bar.amount)}
                  />
                  <span className="text-xs text-muted-foreground">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
