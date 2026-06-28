import { DashboardLayout } from '@/components/DashboardLayout';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Package, Upload, Truck, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/app-utils';
import type { KPI } from '@/data/mock';
import type { CompanyPreview, Order, ShipmentWithOrder, SupplierOfferWithMaterial, SupplierRfqListItem } from '@/types/app';

type SupplierOrderPreview = Pick<Order, 'id' | 'order_number' | 'status' | 'total_amount' | 'created_at'> & {
  buyer: Pick<CompanyPreview, 'name'> | null;
};

type SupplierQuotePreview = {
  id: string;
  status: string;
  total_amount: number | null;
  created_at: string;
  rfq_id: string;
  rfqs: { title: string; companies: Pick<CompanyPreview, 'name'> | null } | null;
};

const quoteStatusText: Record<string, string> = {
  draft: 'черновик предложения',
  sent: 'отправлено покупателю',
  accepted: 'выбрано покупателем',
  rejected: 'не выбрано',
  expired: 'срок действия истёк',
};

export default function SupplierDashboard() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: rfqInvites = [], isLoading: rfqLoading } = useQuery({
    queryKey: ['supplier-rfq-invites', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data: invites, error: invitesError } = await supabase
        .from('rfq_suppliers')
        .select('rfq_id')
        .eq('supplier_company_id', companyId);
      if (invitesError) throw invitesError;
      if (!invites?.length) return [];
      const rfqIds = invites.map(i => i.rfq_id);
      const { data, error } = await supabase
        .from('rfqs')
        .select('id, title, status, needed_by, created_at, buyer_company_id, companies!rfqs_buyer_company_id_fkey(name)')
        .in('id', rfqIds)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as SupplierRfqListItem[];
    },
    enabled: !!companyId,
  });

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['supplier-shipments', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('shipments')
        .select('id, shipment_number, status, planned_date, order_id, supplier_company_id, created_at, orders!shipments_order_id_fkey(order_number, buyer_company_id, companies!orders_buyer_company_id_fkey(name), delivery_address)')
        .eq('supplier_company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as ShipmentWithOrder[];
    },
    enabled: !!companyId,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['supplier-dashboard-orders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, created_at, buyer:companies!orders_buyer_company_id_fkey(name)')
        .eq('supplier_company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as SupplierOrderPreview[];
    },
    enabled: !!companyId,
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['supplier-offers-summary', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('supplier_offers')
        .select('id, price, stock, is_active, material_id, materials!supplier_offers_material_id_fkey(name)')
        .eq('supplier_company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as SupplierOfferWithMaterial[];
    },
    enabled: !!companyId,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['supplier-dashboard-quotes', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('quotes')
        .select('id, status, total_amount, created_at, rfq_id, rfqs!quotes_rfq_id_fkey(title, companies!rfqs_buyer_company_id_fkey(name))')
        .eq('supplier_company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SupplierQuotePreview[];
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

  const unansweredRequests = rfqInvites.filter((rfq) => !quotes.some((quote) => quote.rfq_id === rfq.id));
  const activeQuotes = quotes.filter((quote) => quote.status === 'sent' || quote.status === 'draft');
  const acceptedQuotes = quotes.filter((quote) => quote.status === 'accepted');
  const rejectedQuotes = quotes.filter((quote) => quote.status === 'rejected');
  const ordersToShip = orders.filter((order) => ['confirmed', 'in_progress'].includes(order.status));
  const ordersToShipAmount = ordersToShip.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
  const activeOffersCount = offers.filter((offer) => offer.is_active).length;
  const kpis: KPI[] = [
    { label: 'Новые запросы покупателей', value: String(unansweredRequests.length), change: unansweredRequests.length ? 'нужно ответить' : 'все обработаны', changeType: unansweredRequests.length ? 'negative' : 'positive' },
    { label: 'Коммерческие предложения', value: String(activeQuotes.length), change: activeQuotes.length ? 'ожидают решения' : 'нет активных', changeType: 'neutral' },
    { label: 'Заказы к отгрузке', value: String(ordersToShip.length), change: ordersToShip.length ? `На ${formatCurrency(ordersToShipAmount)}` : 'нет ожидающих заказов', changeType: 'neutral' },
    { label: 'Позиции в прайсе', value: String(activeOffersCount), change: offers.length ? 'активных предложений' : 'прайс не загружен', changeType: activeOffersCount ? 'positive' : 'neutral' },
  ];

  const events = [
    ...unansweredRequests.slice(0, 3).map((rfq) => ({
      id: `rfq-${rfq.id}`,
      title: `Покупатель ${rfq.companies?.name ?? '—'} запросил закупку`,
      body: rfq.title,
      time: formatDate(rfq.created_at),
      href: `/supplier/rfq/${rfq.id}`,
    })),
    ...quotes.slice(0, 3).map((quote) => ({
      id: `quote-${quote.id}`,
      title: `Ваше предложение ${quoteStatusText[quote.status] ?? quote.status}`,
      body: `${quote.rfqs?.title ?? 'Запрос на закупку'} · ${formatCurrency(quote.total_amount ?? 0)}`,
      time: formatDate(quote.created_at),
      href: `/supplier/rfq/${quote.rfq_id}`,
    })),
    ...shipments.slice(0, 3).map((shipment) => ({
      id: `shipment-${shipment.id}`,
      title: `Отгрузка по заказу ${shipment.orders?.order_number ? `#${shipment.orders.order_number}` : ''}`,
      body: `${shipment.orders?.companies?.name ?? 'Покупатель'} · ${shipment.shipment_number ?? shipment.id.slice(0, 8)}`,
      time: formatDate(shipment.planned_date),
      href: `/supplier/shipments/${shipment.id}`,
    })),
  ].sort((left, right) => right.time.localeCompare(left.time)).slice(0, 5);
  const loading = rfqLoading || shipmentsLoading || ordersLoading;

  return (
    <DashboardLayout mode="supplier">
      <div className="demo-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Кабинет поставщика</h1>
            {company && <p className="mt-0.5 text-sm text-muted-foreground">{company.name}{company.inn ? ` · ИНН ${company.inn}` : ''}</p>}
          </div>
          <Link to="/supplier/import">
            <Button size="sm" className="h-8 gap-1 text-xs">
              <Package className="h-3 w-3" /> Обновить прайс-лист
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, i) => <KPICard key={i} kpi={k} />)}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 card-panel">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <div>
                <h3 className="section-title">Заказы и отгрузки</h3>
                <p className="mt-1 text-xs text-muted-foreground">Что нужно подготовить на складе и отправить покупателю</p>
              </div>
              <Link to="/supplier/shipments" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Все отгрузки <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-5">
              {shipmentsLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка…</p>
              ) : shipments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Пока нет созданных отгрузок. Откройте заказ и создайте отгрузку для склада.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="table-header px-4 py-2.5 text-left">Заказ / отгрузка</th>
                      <th className="table-header px-4 py-2.5 text-left">Покупатель</th>
                      <th className="table-header px-4 py-2.5 text-left">Плановая дата</th>
                      <th className="table-header px-4 py-2.5 text-center">Этап</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map(s => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <Link to={`/supplier/shipments/${s.id}`} className="font-medium text-primary hover:underline">
                            {s.orders?.order_number ? `Заказ #${s.orders.order_number}` : 'Заказ'} · {s.shipment_number || s.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium">{s.orders?.companies?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(s.planned_date)}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={s.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card-panel">
            <div className="px-5 pt-5 pb-0">
              <h3 className="section-title">Последние события</h3>
              <p className="mt-1 text-xs text-muted-foreground">Новые запросы, решения покупателей и изменения отгрузок</p>
            </div>
            <div className="p-5">
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
              ) : events.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Событий пока нет</p>
              ) : (
                <div className="space-y-4">
                  {events.map(event => (
                    <Link key={event.id} to={event.href} className="flex gap-3 text-sm group">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span>
                        <span className="block font-medium leading-snug group-hover:text-primary">{event.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{event.body}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">{event.time}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="card-panel p-5">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="section-title">Мои товары и цены</h3>
              <Link to="/supplier/offers" className="text-xs font-medium text-primary hover:underline">Все позиции</Link>
            </div>
            {offersLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
            ) : offers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Прайс-лист пуст. Загрузите Excel или добавьте позиции вручную.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="table-header pb-3 text-left">Материал</th>
                    <th className="table-header pb-3 text-right">Цена за ед.</th>
                    <th className="table-header pb-3 text-right">Остаток</th>
                    <th className="table-header pb-3 text-center">Доступность</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map(o => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{o.materials?.name ?? '—'}</td>
                      <td className="py-3 text-right font-semibold tabular-nums">{formatCurrency(o.price)}</td>
                      <td className="py-3 text-right text-muted-foreground tabular-nums">{o.stock ?? 0}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${o.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {o.is_active ? 'Виден в каталоге' : 'Скрыто'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid gap-6">
            <div className="card-panel p-5">
              <h3 className="section-title mb-5">Статусы коммерческих предложений</h3>
              <div className="flex items-center gap-8">
                <div className="h-32 w-32 rounded-full bg-[conic-gradient(hsl(var(--success))_0_50%,hsl(var(--primary))_50%_82%,hsl(var(--destructive))_82%_100%)] p-7">
                  <div className="h-full w-full rounded-full bg-card" />
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="mr-2 inline-flex h-3 w-3 rounded-sm bg-success" />Выбраны покупателем: {acceptedQuotes.length}</p>
                  <p><span className="mr-2 inline-flex h-3 w-3 rounded-sm bg-primary" />Ждут решения: {activeQuotes.length}</p>
                  <p><span className="mr-2 inline-flex h-3 w-3 rounded-sm bg-destructive" />Не выбраны: {rejectedQuotes.length}</p>
                </div>
              </div>
            </div>

            <div className="card-panel p-5">
              <h3 className="section-title mb-5">Быстрые действия</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { to: '/supplier/import', label: 'Загрузить прайс-лист', icon: <Upload className="h-4 w-4" /> },
                  { to: '/supplier/rfq', label: 'Ответить покупателю', icon: <FileText className="h-4 w-4" /> },
                  { to: '/supplier/shipments', label: 'Управлять отгрузками', icon: <Truck className="h-4 w-4" /> },
                  { to: '/supplier/routes', label: 'Планировать маршрут', icon: <Map className="h-4 w-4" /> },
                ].map(action => (
                  <Link key={action.to} to={action.to} className="flex min-h-16 items-center justify-between rounded-md border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted/40 hover:text-primary">
                    <span>{action.label}</span>
                    {action.icon}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
