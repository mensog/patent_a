import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Clock, Send } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/app-utils';
import { createNotificationsForCompanyUsers, createNotificationsForUsers } from '@/lib/notifications';
import type { Quote, QuoteItem, QuoteStatus, RfqItemWithMaterial, RfqWithBuyerCompany } from '@/types/app';

interface QuoteFormRow {
  rfqItemId: string;
  materialId: string | null;
  materialName: string;
  quantity: number;
  unit: string;
  price: string;
  leadTimeDays: string;
  comment: string;
}

interface QuoteWithItems extends Quote {
  quote_items: QuoteItem[];
}

export default function SupplierRfqResponse() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;
  const [validUntil, setValidUntil] = useState('');
  const [deliveryCost, setDeliveryCost] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<QuoteFormRow[]>([]);

  const { data: rfq, isLoading: rfqLoading, error: rfqError } = useQuery({
    queryKey: ['supplier-rfq', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfqs')
        .select('*, companies!rfqs_buyer_company_id_fkey(name, inn)')
        .eq('id', id!)
        .single();

      if (error) {
        throw error;
      }

      return data as RfqWithBuyerCompany;
    },
    enabled: !!id,
  });

  const { data: items = [], error: itemsError } = useQuery({
    queryKey: ['supplier-rfq-items', id],
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

  const { data: existingQuote } = useQuery({
    queryKey: ['supplier-rfq-quote', id, companyId],
    queryFn: async () => {
      if (!id || !companyId) return null;

      const { data, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .eq('rfq_id', id)
        .eq('supplier_company_id', companyId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as QuoteWithItems | null;
    },
    enabled: !!id && !!companyId,
  });

  useEffect(() => {
    if (!items.length) {
      return;
    }

    const quoteItemsByRfqItemId = new Map<string, QuoteItem>();

    existingQuote?.quote_items.forEach((item) => {
      if (item.rfq_item_id) {
        quoteItemsByRfqItemId.set(item.rfq_item_id, item);
      }
    });

    setRows(
      items.map((item) => {
        const quoteItem = quoteItemsByRfqItemId.get(item.id);

        return {
          rfqItemId: item.id,
          materialId: item.material_id,
          materialName: item.material_name ?? item.materials?.name ?? '—',
          quantity: Number(item.quantity),
          unit: item.unit,
          price: quoteItem?.price !== undefined ? String(quoteItem.price) : '',
          leadTimeDays: quoteItem?.lead_time_days !== null && quoteItem?.lead_time_days !== undefined
            ? String(quoteItem.lead_time_days)
            : '',
          comment: quoteItem?.comment ?? '',
        };
      }),
    );

    setValidUntil(existingQuote?.valid_until?.slice(0, 10) ?? '');
    setDeliveryCost(existingQuote?.delivery_cost !== null && existingQuote?.delivery_cost !== undefined ? String(existingQuote.delivery_cost) : '');
    setNote(existingQuote?.note ?? '');
  }, [existingQuote, items]);

  const totals = useMemo(() => {
    const totalWithoutVat = rows.reduce((sum, row) => {
      const price = Number(row.price);
      return Number.isFinite(price) ? sum + price * row.quantity : sum;
    }, 0);
    const delivery = Number(deliveryCost) || 0;
    const vatAmount = Math.round(totalWithoutVat * 0.2);
    return {
      totalWithoutVat,
      delivery,
      vatAmount,
      totalAmount: totalWithoutVat + vatAmount + delivery,
    };
  }, [deliveryCost, rows]);

  const saveQuoteMutation = useMutation({
    mutationFn: async (status: QuoteStatus) => {
      if (!id || !companyId || !user?.id) {
        throw new Error('Профиль поставщика не готов к созданию коммерческого предложения.');
      }

      const validRows = rows.filter((row) => Number(row.price) > 0);

      if (!validRows.length) {
        throw new Error('Укажите цену хотя бы по одной позиции.');
      }

      const basePayload = {
        rfq_id: id,
        supplier_company_id: companyId,
        created_by: user.id,
        delivery_cost: Number(deliveryCost) || 0,
        note: note.trim() || null,
        valid_until: validUntil || null,
        total_without_vat: totals.totalWithoutVat,
        vat_amount: totals.vatAmount,
        total_amount: totals.totalAmount,
        status,
      };

      let quoteId = existingQuote?.id ?? null;
      const wasAlreadySent = existingQuote?.status === 'sent';

      if (quoteId) {
        const { error: updateError } = await supabase
          .from('quotes')
          .update(basePayload)
          .eq('id', quoteId)
          .eq('supplier_company_id', companyId);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { data, error: insertError } = await supabase
          .from('quotes')
          .insert(basePayload)
          .select('id')
          .single();

        if (insertError || !data) {
          throw insertError ?? new Error('Не удалось создать коммерческое предложение.');
        }

        quoteId = data.id;
      }

      const { error: deleteError } = await supabase.from('quote_items').delete().eq('quote_id', quoteId);

      if (deleteError) {
        throw deleteError;
      }

      const quoteItemsPayload = validRows.map((row) => {
        const price = Number(row.price);
        const leadTimeDays = row.leadTimeDays ? Number(row.leadTimeDays) : null;

        return {
          quote_id: quoteId,
          rfq_item_id: row.rfqItemId,
          material_id: row.materialId,
          material_name: row.materialName,
          quantity: row.quantity,
          unit: row.unit,
          price,
          lead_time_days: leadTimeDays,
          comment: row.comment.trim() || null,
          vat_rate: 20,
          line_total: price * row.quantity,
        };
      });

      const { error: quoteItemsError } = await supabase.from('quote_items').insert(quoteItemsPayload);

      if (quoteItemsError) {
        throw quoteItemsError;
      }

      if (status === 'sent') {
        const { error: rfqStatusError } = await supabase
          .from('rfqs')
          .update({ status: 'quoted' })
          .eq('id', id)
          .in('status', ['published', 'quoted']);

        if (rfqStatusError) {
          console.warn('Не удалось обновить статус запроса на закупку:', rfqStatusError.message);
        }

        const notificationPayload = {
          type: 'quote' as const,
          title: wasAlreadySent ? 'Коммерческое предложение обновлено поставщиком' : 'Получено новое коммерческое предложение',
          body: `${profile?.full_name ?? 'Поставщик'} отправил коммерческое предложение по запросу на закупку "${rfq?.title ?? 'запрос'}" на сумму ${formatCurrency(totals.totalAmount)}.`,
          related_entity_id: id,
          related_entity_type: 'rfq',
        };

        if (rfq?.created_by) {
          await createNotificationsForUsers([rfq.created_by], notificationPayload);
        } else if (rfq?.buyer_company_id) {
          await createNotificationsForCompanyUsers([rfq.buyer_company_id], notificationPayload);
        }
      }
    },
    onSuccess: async (_data, status) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['supplier-rfq-quote', id, companyId] }),
        queryClient.invalidateQueries({ queryKey: ['rfq-quotes', id] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-rfq', id] }),
      ]);
      toast({ title: status === 'sent' ? 'Коммерческое предложение отправлено покупателю' : 'Черновик сохранён' });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Не удалось сохранить коммерческое предложение',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const updateRow = (rfqItemId: string, field: keyof Omit<QuoteFormRow, 'rfqItemId' | 'materialId' | 'materialName' | 'quantity' | 'unit'>, value: string) => {
    setRows((current) =>
      current.map((row) => (row.rfqItemId === rfqItemId ? { ...row, [field]: value } : row)),
    );
  };

  if (rfqLoading) {
    return <DashboardLayout mode="supplier"><p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p></DashboardLayout>;
  }

  if (rfqError || itemsError) {
    return <DashboardLayout mode="supplier"><p className="py-16 text-center text-sm text-destructive">Не удалось загрузить запрос покупателя.</p></DashboardLayout>;
  }

  if (!rfq) {
    return <DashboardLayout mode="supplier"><p className="py-16 text-center text-sm text-muted-foreground">Запрос не найден</p></DashboardLayout>;
  }

  const buyer = rfq.companies;

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div>
          <Link to="/supplier/rfq" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Все запросы
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">{rfq.title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Ответ на запрос покупателя: коммерческое предложение</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={rfq.status} />
              {rfq.needed_by && (
                <div className="flex items-center gap-1 text-xs text-warning font-medium">
                  <Clock className="h-3 w-3" /> До {formatDate(rfq.needed_by)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="kpi-card col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Покупатель</p>
                <p className="mt-0.5 text-sm font-semibold">{buyer?.name ?? '—'}</p>
                {buyer?.inn && <p className="text-xs text-muted-foreground">ИНН {buyer.inn}</p>}
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Позиции</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums">{items.length}</p>
          </div>
        </div>

        {rfq.description && (
          <div className="card-panel p-5">
            <h3 className="section-title mb-2">Описание запроса</h3>
            <p className="text-sm text-muted-foreground">{rfq.description}</p>
          </div>
        )}

        <div className="card-panel overflow-hidden">
          <div className="flex flex-col gap-4 border-b px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Коммерческое предложение</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Заполните вашу цену, срок поставки и комментарии по каждой позиции запроса.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
              <div>
                <Label className="text-xs text-muted-foreground">Действует до</Label>
                <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Стоимость доставки, ₽</Label>
                <Input value={deliveryCost} onChange={(event) => setDeliveryCost(event.target.value)} className="h-9 text-xs" />
              </div>
            </div>
          </div>
          <div className="p-5">
            {rows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Нет позиций</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] table-fixed text-sm">
                  <colgroup>
                    <col className="w-[43%]" />
                    <col className="w-[13%]" />
                    <col className="w-[15%]" />
                    <col className="w-[12%]" />
                    <col className="w-[17%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="table-header px-4 py-2.5 text-left">Материал</th>
                      <th className="table-header px-4 py-2.5 text-right">Запрошено</th>
                      <th className="table-header px-4 py-2.5 text-right">Ваша цена, ₽</th>
                      <th className="table-header px-4 py-2.5 text-right">Срок, дн.</th>
                      <th className="table-header px-4 py-2.5 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const lineTotal = Number(row.price) > 0 ? Number(row.price) * row.quantity : 0;

                      return (
                        <tr key={row.rfqItemId} className="border-b last:border-0 align-top">
                          <td className="px-4 py-3.5">
                            <p className="font-medium leading-snug">{row.materialName}</p>
                            <Input
                              value={row.comment}
                              onChange={(event) => updateRow(row.rfqItemId, 'comment', event.target.value)}
                              placeholder="Комментарий по позиции"
                              className="mt-2 h-8 w-full text-xs"
                            />
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium tabular-nums">
                            {row.quantity} {row.unit}
                          </td>
                          <td className="px-4 py-3.5">
                            <Input
                              value={row.price}
                              onChange={(event) => updateRow(row.rfqItemId, 'price', event.target.value)}
                              placeholder="0"
                              className="ml-auto h-9 w-full text-right text-sm tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <Input
                              value={row.leadTimeDays}
                              onChange={(event) => updateRow(row.rfqItemId, 'leadTimeDays', event.target.value)}
                              placeholder="дни"
                              className="ml-auto h-9 w-full text-right text-sm tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Без НДС</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums">{formatCurrency(totals.totalWithoutVat)}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">НДС 20%</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums">{formatCurrency(totals.vatAmount)}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Итого</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-success">{formatCurrency(totals.totalAmount)}</p>
          </div>
        </div>

        <div className="card-panel p-5">
          <h3 className="section-title mb-3">Комментарий к предложению</h3>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Условия поставки, особые требования, комментарии для покупателя..."
          />
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              className="text-xs h-8"
              disabled={saveQuoteMutation.isPending}
              onClick={() => saveQuoteMutation.mutate('draft')}
            >
              Сохранить черновик
            </Button>
            <Button
              className="gap-2 text-xs h-8"
              disabled={saveQuoteMutation.isPending}
              onClick={() => saveQuoteMutation.mutate('sent')}
            >
              <Send className="h-3.5 w-3.5" /> Отправить покупателю
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
