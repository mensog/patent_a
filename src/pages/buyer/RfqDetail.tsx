import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Download, Sparkles, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/app-utils';
import { createNotificationsForUsers } from '@/lib/notifications';
import type { QuoteItem, QuoteWithCompany, Rfq, RfqItemWithMaterial } from '@/types/app';

type AdvisorPreset = 'balanced' | 'price' | 'speed' | 'reliability';

interface SupplierPerformanceMetrics {
  ordersCount: number;
  shipmentsCount: number;
  deliveredRate: number;
  onTimeRate: number;
  reliability: number;
}

interface LinkedOrderPreview {
  id: string;
  order_number: string | null;
  status: string;
  quote_id: string | null;
  total_amount: number;
  created_at: string;
}

interface QuoteAdvisorRow {
  quote: QuoteWithCompany;
  leadTimeDays: number | null;
  effectiveLeadTimeDays: number;
  reliability: number;
  score: number;
}

interface QuoteWithItems extends QuoteWithCompany {
  quote_items: QuoteItem[];
}

const advisorPresets: Record<
  AdvisorPreset,
  { label: string; description: string; weights: { price: number; speed: number; reliability: number } }
> = {
  balanced: {
    label: 'Баланс',
    description: 'Цена + срок + стабильность',
    weights: { price: 0.5, speed: 0.3, reliability: 0.2 },
  },
  price: {
    label: 'Минимальная цена',
    description: 'Максимальный приоритет стоимости',
    weights: { price: 0.7, speed: 0.2, reliability: 0.1 },
  },
  speed: {
    label: 'Быстрая поставка',
    description: 'Главное — сократить срок',
    weights: { price: 0.25, speed: 0.6, reliability: 0.15 },
  },
  reliability: {
    label: 'Надёжность',
    description: 'Фокус на успешных поставках',
    weights: { price: 0.25, speed: 0.2, reliability: 0.55 },
  },
};

function toNumeric(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeLowerBetter(value: number, minValue: number, maxValue: number) {
  if (maxValue === minValue) {
    return 1;
  }

  return (maxValue - value) / (maxValue - minValue);
}

function normalizeHigherBetter(value: number, minValue: number, maxValue: number) {
  if (maxValue === minValue) {
    return 1;
  }

  return (value - minValue) / (maxValue - minValue);
}

function getAverageLeadTime(quoteItems?: QuoteItem[]) {
  if (!quoteItems?.length) {
    return null;
  }

  const leadRows = quoteItems.filter((item) => Number(item.lead_time_days) > 0);

  if (!leadRows.length) {
    return null;
  }

  const weightedLead = leadRows.reduce((sum, item) => {
    const quantity = toNumeric(item.quantity, 0);
    const lead = toNumeric(item.lead_time_days, 0);
    return sum + lead * quantity;
  }, 0);
  const totalQuantity = leadRows.reduce((sum, item) => sum + toNumeric(item.quantity, 0), 0);

  if (!totalQuantity) {
    return null;
  }

  return weightedLead / totalQuantity;
}

export default function RfqDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [advisorPreset, setAdvisorPreset] = useState<AdvisorPreset>('balanced');

  const { data: rfq, isLoading: rfqLoading, error: rfqError } = useQuery({
    queryKey: ['rfq', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfqs')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) {
        throw error;
      }
      return data as Rfq;
    },
    enabled: !!id,
  });

  const { data: items = [], isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ['rfq-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfq_items')
        .select('*, materials!rfq_items_material_id_fkey(name)')
        .eq('rfq_id', id!);
      if (error) {
        throw error;
      }
      return (data ?? []) as RfqItemWithMaterial[];
    },
    enabled: !!id,
  });

  const { data: quotes = [], isLoading: quotesLoading, error: quotesError } = useQuery({
    queryKey: ['rfq-quotes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, companies!quotes_supplier_company_id_fkey(name), quote_items(*)')
        .eq('rfq_id', id!)
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      return (data ?? []) as QuoteWithCompany[];
    },
    enabled: !!id,
  });

  const { data: rfqOrders = [] } = useQuery({
    queryKey: ['rfq-orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, quote_id, total_amount, created_at')
        .eq('rfq_id', id!)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as LinkedOrderPreview[];
    },
    enabled: !!id,
  });

  const orderByQuoteId = useMemo(
    () =>
      new Map(
        rfqOrders
          .filter((order) => !!order.quote_id)
          .map((order) => [order.quote_id as string, order]),
      ),
    [rfqOrders],
  );

  const supplierIds = useMemo(
    () => Array.from(new Set(quotes.map((quote) => quote.supplier_company_id))),
    [quotes],
  );

  const { data: supplierPerformance = {} } = useQuery({
    queryKey: ['rfq-supplier-performance', profile?.company_id, supplierIds.join('|')],
    queryFn: async () => {
      if (!profile?.company_id || supplierIds.length === 0) {
        return {} as Record<string, SupplierPerformanceMetrics>;
      }

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, supplier_company_id')
        .eq('buyer_company_id', profile.company_id)
        .in('supplier_company_id', supplierIds);

      if (ordersError) {
        throw ordersError;
      }

      const safeOrders = orders ?? [];
      const orderIds = safeOrders.map((order) => order.id);

      const shipmentsByOrder = new Map<
        string,
        Array<{ status: string; planned_date: string | null; delivered_at: string | null }>
      >();

      if (orderIds.length > 0) {
        const { data: shipments, error: shipmentsError } = await supabase
          .from('shipments')
          .select('order_id, status, planned_date, delivered_at')
          .in('order_id', orderIds);

        if (shipmentsError) {
          throw shipmentsError;
        }

        (shipments ?? []).forEach((shipment) => {
          const list = shipmentsByOrder.get(shipment.order_id) ?? [];
          list.push({
            status: shipment.status,
            planned_date: shipment.planned_date,
            delivered_at: shipment.delivered_at,
          });
          shipmentsByOrder.set(shipment.order_id, list);
        });
      }

      return supplierIds.reduce<Record<string, SupplierPerformanceMetrics>>((accumulator, supplierId) => {
        const supplierOrders = safeOrders.filter((order) => order.supplier_company_id === supplierId);
        const supplierShipments = supplierOrders.flatMap((order) => shipmentsByOrder.get(order.id) ?? []);
        const deliveredShipments = supplierShipments.filter((shipment) => shipment.status === 'delivered');
        const onTimeDelivered = deliveredShipments.filter((shipment) => {
          if (!shipment.planned_date || !shipment.delivered_at) {
            return false;
          }

          return new Date(shipment.delivered_at).getTime() <= new Date(shipment.planned_date).getTime();
        });

        const deliveredRate = supplierShipments.length
          ? deliveredShipments.length / supplierShipments.length
          : 0;
        const onTimeRate = deliveredShipments.length
          ? onTimeDelivered.length / deliveredShipments.length
          : 0;

        const reliabilityRaw = supplierShipments.length
          ? deliveredRate * 0.7 + onTimeRate * 0.3
          : supplierOrders.length
            ? 0.58
            : 0.5;

        accumulator[supplierId] = {
          ordersCount: supplierOrders.length,
          shipmentsCount: supplierShipments.length,
          deliveredRate,
          onTimeRate,
          reliability: Math.round(reliabilityRaw * 100),
        };

        return accumulator;
      }, {});
    },
    enabled: !!profile?.company_id && supplierIds.length > 0,
  });

  const advisorRows = useMemo(() => {
    const candidates = quotes.filter((quote) => quote.status === 'sent' || quote.status === 'accepted');

    if (!candidates.length) {
      return [] as QuoteAdvisorRow[];
    }

    const leadValues = candidates
      .map((quote) => getAverageLeadTime(quote.quote_items))
      .filter((value): value is number => value !== null);
    const leadFallback = leadValues.length ? Math.max(...leadValues) + 5 : 14;

    const quoteMetrics = candidates.map((quote) => {
      const leadTimeDays = getAverageLeadTime(quote.quote_items);
      const effectiveLeadTimeDays = leadTimeDays ?? leadFallback;
      const reliability = supplierPerformance[quote.supplier_company_id]?.reliability ?? 50;
      const totalAmount = toNumeric(quote.total_amount, 0);

      return {
        quote,
        leadTimeDays,
        effectiveLeadTimeDays,
        reliability,
        totalAmount,
      };
    });

    const minPrice = Math.min(...quoteMetrics.map((metric) => metric.totalAmount));
    const maxPrice = Math.max(...quoteMetrics.map((metric) => metric.totalAmount));
    const minLead = Math.min(...quoteMetrics.map((metric) => metric.effectiveLeadTimeDays));
    const maxLead = Math.max(...quoteMetrics.map((metric) => metric.effectiveLeadTimeDays));
    const minReliability = Math.min(...quoteMetrics.map((metric) => metric.reliability));
    const maxReliability = Math.max(...quoteMetrics.map((metric) => metric.reliability));

    const weights = advisorPresets[advisorPreset].weights;

    return quoteMetrics
      .map((metric) => {
        const priceScore = normalizeLowerBetter(metric.totalAmount, minPrice, maxPrice);
        const speedScore = normalizeLowerBetter(metric.effectiveLeadTimeDays, minLead, maxLead);
        const reliabilityScore = normalizeHigherBetter(metric.reliability, minReliability, maxReliability);

        return {
          quote: metric.quote,
          leadTimeDays: metric.leadTimeDays,
          effectiveLeadTimeDays: metric.effectiveLeadTimeDays,
          reliability: metric.reliability,
          score: (priceScore * weights.price + speedScore * weights.speed + reliabilityScore * weights.reliability) * 100,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return toNumeric(left.quote.total_amount, 0) - toNumeric(right.quote.total_amount, 0);
      });
  }, [advisorPreset, quotes, supplierPerformance]);

  const recommendedQuote = advisorRows[0]?.quote ?? null;
  const recommendedQuoteOrder = recommendedQuote ? orderByQuoteId.get(recommendedQuote.id) : null;
  const createdOrdersTotalAmount = rfqOrders.reduce((sum, order) => sum + toNumeric(order.total_amount, 0), 0);

  const sortedQuotes = useMemo(
    () => [...quotes].sort((left, right) => toNumeric(left.total_amount, 0) - toNumeric(right.total_amount, 0)),
    [quotes],
  );

  const rejectQuoteMutation = useMutation({
    mutationFn: async (quote: QuoteWithCompany) => {
      if (!id) {
        throw new Error('Запрос на закупку не определён.');
      }

      if (orderByQuoteId.has(quote.id)) {
        throw new Error('Нельзя отклонить коммерческое предложение, на основе которого уже создан заказ.');
      }

      const { error: updateError } = await supabase
        .from('quotes')
        .update({ status: 'rejected' })
        .eq('id', quote.id)
        .eq('rfq_id', id);

      if (updateError) {
        throw updateError;
      }

      const { data: quoteStatuses, error: quoteStatusesError } = await supabase
        .from('quotes')
        .select('status')
        .eq('rfq_id', id);

      if (quoteStatusesError) {
        throw quoteStatusesError;
      }

      const hasOpenQuotes = (quoteStatuses ?? []).some(
        (quoteStatusRow) => quoteStatusRow.status === 'sent' || quoteStatusRow.status === 'draft',
      );
      const nextRfqStatus = hasOpenQuotes ? 'quoted' : 'closed';

      const { error: rfqStatusError } = await supabase
        .from('rfqs')
        .update({ status: nextRfqStatus })
        .eq('id', id);

      if (rfqStatusError) {
        throw rfqStatusError;
      }

      if (quote.created_by) {
        await createNotificationsForUsers([quote.created_by], {
          type: 'quote',
          title: 'Коммерческое предложение отклонено',
          body: `Покупатель отклонил ваше предложение по запросу "${rfq?.title ?? 'запрос'}".`,
          related_entity_id: id,
          related_entity_type: 'rfq',
        });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rfq', id] }),
        queryClient.invalidateQueries({ queryKey: ['rfq-quotes', id] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);

      toast({ title: 'Коммерческое предложение отклонено' });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Не удалось отклонить коммерческое предложение',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: async (quote: QuoteWithCompany) => {
      if (!user?.id) {
        throw new Error('Пользователь не авторизован.');
      }

      const { data, error } = await supabase.rpc('accept_quote_as_order', { _quote_id: quote.id });

      if (error) {
        throw error;
      }

      const result = data?.[0];

      if (!result?.order_id) {
        throw new Error('База данных не вернула созданный заказ.');
      }

      return {
        order: {
          id: result.order_id,
          order_number: result.order_number,
        },
        alreadyExists: result.already_exists,
      };
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rfq', id] }),
        queryClient.invalidateQueries({ queryKey: ['rfq-quotes', id] }),
        queryClient.invalidateQueries({ queryKey: ['rfq-orders', id] }),
        queryClient.invalidateQueries({ queryKey: ['buyer-orders-list', profile?.company_id] }),
        queryClient.invalidateQueries({ queryKey: ['buyer-orders', profile?.company_id] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-rfq', id] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-rfq-quote', id] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['order', result.order.id] }),
      ]);

      if (result.alreadyExists) {
        toast({
          title: 'Коммерческое предложение уже принято ранее',
          description: result.order.order_number
            ? `Заказ #${result.order.order_number} уже создан для этого коммерческого предложения.`
            : 'Заказ уже создан для этого коммерческого предложения.',
        });
      } else {
        toast({
          title: 'Коммерческое предложение принято',
          description: result.order.order_number
            ? `Заказ #${result.order.order_number} создан и доступен в разделе заказов.`
            : 'Заказ создан и доступен в разделе заказов.',
        });
      }
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Не удалось принять коммерческое предложение',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const minQuoteAmount = quotes.length > 0 ? Math.min(...quotes.map((quote) => toNumeric(quote.total_amount, 0))) : null;
  const advisorPresetConfig = advisorPresets[advisorPreset];
  const advisorTop = advisorRows[0] ?? null;
  const isLoading = rfqLoading || itemsLoading || quotesLoading;
  const hasError = !!rfqError || !!itemsError || !!quotesError;

  if (isLoading) {
    return (
      <DashboardLayout mode="buyer">
        <p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p>
      </DashboardLayout>
    );
  }

  if (hasError) {
    return (
      <DashboardLayout mode="buyer">
        <p className="py-16 text-center text-sm text-destructive">Не удалось загрузить данные запроса на закупку.</p>
      </DashboardLayout>
    );
  }

  if (!rfq) {
    return (
      <DashboardLayout mode="buyer">
        <p className="py-16 text-center text-sm text-muted-foreground">Запрос не найден</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div>
          <Link
            to="/buyer/rfq"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3 w-3" /> Все запросы
          </Link>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="page-title">{rfq.title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Создан {formatDate(rfq.created_at)} · Дедлайн {formatDate(rfq.needed_by)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={rfq.status} />
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" disabled>
                <Download className="h-3 w-3" /> Экспорт
              </Button>
            </div>
          </div>
        </div>

        {rfqOrders.length > 0 && (
          <div className="rounded-lg border border-success/30 bg-success/[0.06] p-4">
            <p className="text-sm font-semibold text-foreground">
              По этому запросу уже создано заказов: {rfqOrders.length}.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Общая сумма: {formatCurrency(createdOrdersTotalAmount)}</span>
              {rfqOrders.slice(0, 3).map((order) => (
                <Link key={order.id} to={`/buyer/orders/${order.id}`} className="font-medium text-primary hover:underline">
                  {order.order_number ? `#${order.order_number}` : order.id.slice(0, 8)}
                </Link>
              ))}
              {rfqOrders.length > 3 && <span>и ещё {rfqOrders.length - 3}</span>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Позиции</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums">{items.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Получено предложений</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-primary">{quotes.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Мин. сумма предложения</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-success">
              {minQuoteAmount === null ? '—' : formatCurrency(minQuoteAmount)}
            </p>
          </div>
        </div>

        {rfq.description && (
          <div className="card-panel p-5">
            <h3 className="section-title mb-2">Описание</h3>
            <p className="text-sm text-muted-foreground">{rfq.description}</p>
          </div>
        )}

        {advisorRows.length > 0 && (
          <div className="card-panel">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <div>
                <h3 className="section-title">Умный выбор поставщика</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{advisorPresetConfig.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(advisorPresets) as AdvisorPreset[]).map((preset) => (
                  <button
                    key={preset}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      advisorPreset === preset
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                    onClick={() => setAdvisorPreset(preset)}
                  >
                    {advisorPresets[preset].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="table-header px-4 py-2.5 text-left">Поставщик</th>
                    <th className="table-header px-4 py-2.5 text-right">Сумма</th>
                    <th className="table-header px-4 py-2.5 text-right">Срок, дн.</th>
                    <th className="table-header px-4 py-2.5 text-right">Надёжность</th>
                    <th className="table-header px-4 py-2.5 text-right">Скоринг</th>
                  </tr>
                </thead>
                <tbody>
                  {advisorRows.map((row, index) => {
                    const performance = supplierPerformance[row.quote.supplier_company_id];

                    return (
                      <tr key={row.quote.id} className={`border-b last:border-0 ${index === 0 ? 'bg-success/[0.05]' : ''}`}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Sparkles className="h-3.5 w-3.5 text-success" />}
                            <span className="font-semibold">{row.quote.companies?.name ?? '—'}</span>
                          </div>
                          {performance && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {performance.ordersCount} заказов · {performance.shipmentsCount} отгрузок
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                          {formatCurrency(row.quote.total_amount ?? 0)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                          {row.leadTimeDays ? `${Math.round(row.leadTimeDays)} дн.` : 'нет данных'}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{row.reliability}%</td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums">{row.score.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {advisorTop && (
                <div className="mt-4 flex items-center justify-between rounded-md border bg-muted/30 p-3.5">
                  <p className="text-xs text-muted-foreground">
                    Рекомендация: <span className="font-semibold text-foreground">{advisorTop.quote.companies?.name ?? '—'}</span>
                    {' '}({advisorTop.score.toFixed(1)} баллов по профилю «{advisorPresetConfig.label}»)
                  </p>
                  {recommendedQuoteOrder ? (
                    <Link to={`/buyer/orders/${recommendedQuoteOrder.id}`} className="text-xs font-medium text-primary hover:underline">
                      Открыть связанный заказ →
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      disabled={!recommendedQuote || acceptQuoteMutation.isPending}
                      onClick={() => recommendedQuote && acceptQuoteMutation.mutate(recommendedQuote)}
                    >
                      <Sparkles className="h-3 w-3" />
                      {acceptQuoteMutation.isPending ? 'Создание заказа…' : 'Принять рекомендованное предложение'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {quotes.length > 0 && (
          <div className="card-panel">
            <div className="px-5 pt-5 pb-0">
              <h3 className="text-base font-semibold text-foreground">Коммерческие предложения</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{quotes.length} предложений</p>
            </div>
            <div className="p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="table-header px-4 py-2.5 text-left">Поставщик</th>
                    <th className="table-header px-4 py-2.5 text-right">Сумма</th>
                    <th className="table-header px-4 py-2.5 text-right">Доставка</th>
                    <th className="table-header px-4 py-2.5 text-right">Действует до</th>
                    <th className="table-header px-4 py-2.5 text-center">Статус</th>
                    <th className="table-header px-4 py-2.5 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedQuotes.map((quote) => {
                    const isPendingRowAction = acceptQuoteMutation.isPending || rejectQuoteMutation.isPending;
                    const canManageQuote = quote.status === 'sent';
                    const quoteOrder = orderByQuoteId.get(quote.id);
                    const quoteOrderLink = quoteOrder ? `/buyer/orders/${quoteOrder.id}` : null;

                    return (
                      <tr key={quote.id} className="border-b last:border-0 transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3.5 font-semibold">{quote.companies?.name ?? '—'}</td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                          {formatCurrency(quote.total_amount ?? 0)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(quote.delivery_cost ?? 0)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">
                          {formatDate(quote.valid_until)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={quote.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {quoteOrderLink ? (
                            <Link to={quoteOrderLink} className="text-xs font-medium text-primary hover:underline">
                              Открыть заказ →
                            </Link>
                          ) : canManageQuote ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                disabled={isPendingRowAction}
                                onClick={() => rejectQuoteMutation.mutate(quote)}
                              >
                                <X className="h-3 w-3" /> Отклонить
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                disabled={isPendingRowAction}
                                onClick={() => acceptQuoteMutation.mutate(quote)}
                              >
                                <Check className="h-3 w-3" /> Принять
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card-panel">
          <div className="px-5 pt-5 pb-0">
            <h3 className="section-title">Позиции запроса</h3>
          </div>
          <div className="p-5">
            {items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Нет позиций</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="table-header px-4 py-2.5 text-left">№</th>
                    <th className="table-header px-4 py-2.5 text-left">Наименование</th>
                    <th className="table-header px-4 py-2.5 text-right">Кол-во</th>
                    <th className="table-header px-4 py-2.5 text-left">Ед.</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{item.material_name ?? item.materials?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
