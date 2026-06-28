import { useState } from 'react';
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

type ChartRange = '6m' | '12m';
type ChartStyle = 'bars' | 'line';

function getChartMonths(range: ChartRange) {
  const now = new Date();
  const monthsCount = range === '12m' ? 12 : 6;

  return Array.from({ length: monthsCount }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1 + index, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: date.getMonth(),
      year: date.getFullYear(),
      label: date.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''),
    };
  });
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: value >= 10_000_000 ? 1 : 2 })} млн ₽`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString('ru-RU')} тыс. ₽`;
  }

  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

function getChartButtonClass(active: boolean) {
  return `rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
  }`;
}

export default function BuyerDashboard() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [chartRange, setChartRange] = useState<ChartRange>('6m');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('bars');
  const months = getChartMonths(chartRange);

  const { data: rfqs = [], isLoading: rfqsLoading } = useQuery({
    queryKey: ['buyer-rfqs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('rfqs')
        .select('id, title, status, needed_by, created_at')
        .eq('buyer_company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(8);
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
        .limit(50);
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
        .limit(20);
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
  const monthlyBars = months.map((month) => {
    const amount = orders
      .filter((order) => {
        const date = new Date(order.created_at);
        return date.getMonth() === month.month && date.getFullYear() === month.year;
      })
      .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
    return { ...month, amount };
  });
  const maxMonthlyAmount = Math.max(...monthlyBars.map((bar) => bar.amount), 1);
  const chartBars = monthlyBars.map((bar, index) => ({
    ...bar,
    index,
    height: bar.amount > 0 ? Math.max(8, Math.round((bar.amount / maxMonthlyAmount) * 100)) : 2,
  }));
  const chartPointCount = Math.max(chartBars.length - 1, 1);
  const chartPoints = chartBars.map((bar) => {
    const x = 24 + (bar.index / chartPointCount) * 552;
    const y = 148 - (bar.amount / maxMonthlyAmount) * 124;
    return { ...bar, x, y };
  });
  const linePath = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = chartPoints.length
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} 148 L ${chartPoints[0].x} 148 Z`
    : '';
  const chartTitle = chartRange === '12m' ? 'Объём закупок за год' : 'Объём закупок за 6 месяцев';
  const events = [
    ...rfqs.slice(0, 3).map((rfq) => ({
      id: `rfq-${rfq.id}`,
      text: `Запрос на закупку «${rfq.title}» обновлён`,
      time: formatDate(rfq.created_at),
      href: `/buyer/rfq/${rfq.id}`,
    })),
    ...orders.slice(0, 3).map((order) => ({
      id: `order-${order.id}`,
      text: `Заказ ${order.order_number ? `#${order.order_number}` : order.id.slice(0, 8)} у поставщика ${order.companies?.name ?? '—'}`,
      time: formatDate(order.created_at),
      href: `/buyer/orders/${order.id}`,
    })),
  ].slice(0, 4);
  const kpis: KPI[] = [
    { label: 'Активные запросы на закупку', value: String(activeRfqs.length), change: 'отправлены поставщикам', changeType: 'neutral' },
    { label: 'Ждём предложения', value: String(waitingQuotes), change: waitingQuotes ? 'поставщики ещё не ответили' : 'нет ожидания', changeType: waitingQuotes ? 'negative' : 'positive' },
    { label: 'Заказы в работе', value: String(activeOrders.length), change: `На ${formatCurrency(activeOrdersAmount)}`, changeType: 'neutral' },
    { label: 'Ближайшая поставка', value: nearestShipment?.planned_date ? formatDate(nearestShipment.planned_date) : '—', change: nearestShipment?.shipment_number ? `Отгрузка ${nearestShipment.shipment_number}` : 'нет плановых поставок', changeType: 'neutral' },
  ];

  const loading = rfqsLoading || ordersLoading;

  return (
    <DashboardLayout mode="buyer">
      <div className="demo-page">
        <div>
          <h1 className="page-title">Кабинет покупателя</h1>
          {company && <p className="mt-0.5 text-sm text-muted-foreground">{company.name}{company.inn ? ` · ИНН ${company.inn}` : ''}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, i) => (
            nearestShipment && k.label === 'Ближайшая поставка'
              ? <Link key={i} to={`/buyer/shipments/${nearestShipment.id}`}><KPICard kpi={k} /></Link>
              : <KPICard key={i} kpi={k} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 card-panel">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <div>
                <h3 className="section-title">Последние запросы на закупку (RFQ)</h3>
                <p className="mt-1 text-xs text-muted-foreground">RFQ — запрос покупателя поставщикам на коммерческие предложения</p>
              </div>
              <Link to="/buyer/rfq" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Все запросы <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-5 pb-5 pt-3">
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка…</p>
              ) : rfqs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет запросов на закупку</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="table-header pb-3 text-left">Что закупаем</th>
                      <th className="table-header pb-3 text-center">Состояние</th>
                      <th className="table-header pb-3 text-right">Нужно к</th>
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

          <div className="card-panel p-5">
            <div className="mb-4 flex items-center justify-between">
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

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="card-panel p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="section-title">Активные заказы</h3>
              <Link to="/buyer/orders" className="text-xs font-medium text-primary hover:underline">Все заказы</Link>
            </div>
            {ordersLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Загрузка...</p>
            ) : activeOrders.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Нет активных заказов</p>
            ) : (
              <div className="space-y-2">
                {activeOrders.slice(0, 4).map(o => (
                  <Link
                    key={o.id}
                    to={`/buyer/orders/${o.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_120px_150px] items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        Заказ {o.order_number ? `#${o.order_number}` : o.id.slice(0, 8)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {o.companies?.name ?? 'Поставщик не указан'}
                      </span>
                    </div>
                    <span className="text-right text-sm font-bold tabular-nums text-foreground">
                      {formatCompactCurrency(Number(o.total_amount ?? 0))}
                    </span>
                    <span className="flex justify-end">
                      <StatusBadge status={o.status} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card-panel p-5">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="section-title">{chartTitle}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Сумма созданных заказов по месяцам</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={getChartButtonClass(chartRange === '6m')} onClick={() => setChartRange('6m')}>
                  6 месяцев
                </button>
                <button type="button" className={getChartButtonClass(chartRange === '12m')} onClick={() => setChartRange('12m')}>
                  Год
                </button>
                <button type="button" className={getChartButtonClass(chartStyle === 'bars')} onClick={() => setChartStyle('bars')}>
                  Столбцы
                </button>
                <button type="button" className={getChartButtonClass(chartStyle === 'line')} onClick={() => setChartStyle('line')}>
                  Линия
                </button>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Всего</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{formatCompactCurrency(monthlyBars.reduce((sum, bar) => sum + bar.amount, 0))}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Максимум</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{formatCompactCurrency(maxMonthlyAmount)}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Среднее</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{formatCompactCurrency(monthlyBars.reduce((sum, bar) => sum + bar.amount, 0) / Math.max(monthlyBars.length, 1))}</p>
              </div>
            </div>

            <div className="grid h-72 grid-cols-[72px_minmax(0,1fr)] gap-4">
              <div className="flex flex-col justify-between pb-12 pt-2 text-right text-[11px] text-muted-foreground">
                <span>{formatCompactCurrency(maxMonthlyAmount)}</span>
                <span>{formatCompactCurrency(maxMonthlyAmount / 2)}</span>
                <span>0 ₽</span>
              </div>
              <div className="relative min-w-0 overflow-hidden rounded-xl border bg-gradient-to-b from-muted/30 to-transparent px-4 pt-4">
                <div className="absolute inset-x-4 top-8 h-px bg-border" />
                <div className="absolute inset-x-4 top-[48%] h-px bg-border/80" />
                <div className="absolute inset-x-4 bottom-14 h-px bg-border" />

                {chartStyle === 'bars' ? (
                  <div
                    className="relative z-10 grid h-full items-end gap-3 pb-12"
                    style={{ gridTemplateColumns: `repeat(${chartBars.length}, minmax(0, 1fr))` }}
                  >
                    {chartBars.map(bar => (
                      <div key={bar.key} className="flex h-full min-w-0 flex-col justify-end gap-2">
                        <div className="flex min-h-0 flex-1 items-end justify-center">
                          <div
                            className="w-full max-w-[46px] rounded-t-xl bg-gradient-to-t from-primary to-primary/70 shadow-sm transition-all hover:from-primary/90 hover:to-primary"
                            style={{ height: `${bar.height}%` }}
                            title={formatCurrency(bar.amount)}
                          />
                        </div>
                        <div className="text-center leading-tight">
                          <span className="block text-[11px] font-medium text-muted-foreground">{bar.label}</span>
                          <span className="mt-1 block text-[10px] tabular-nums text-muted-foreground">{formatCompactCurrency(bar.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative z-10 h-full pb-12">
                    <svg className="h-[calc(100%-3rem)] w-full overflow-visible" viewBox="0 0 600 170" preserveAspectRatio="none" role="img" aria-label={chartTitle}>
                      <path d={areaPath} fill="hsl(var(--primary))" opacity="0.12" />
                      <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                      {chartPoints.map(point => (
                        <circle key={point.key} cx={point.x} cy={point.y} r="5" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                      ))}
                    </svg>
                    <div
                      className="absolute inset-x-0 bottom-0 grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${chartPoints.length}, minmax(0, 1fr))` }}
                    >
                      {chartPoints.map(point => (
                        <div key={point.key} className="text-center leading-tight">
                          <span className="block text-[11px] font-medium text-muted-foreground">{point.label}</span>
                          <span className="mt-1 block text-[10px] tabular-nums text-muted-foreground">{formatCompactCurrency(point.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
