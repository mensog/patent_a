import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Building2, Send } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function SupplierRfqResponse() {
  const { id } = useParams<{ id: string }>();

  const { data: rfq, isLoading: rfqLoading } = useQuery({
    queryKey: ['supplier-rfq', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfqs')
        .select('*, companies!rfqs_buyer_company_id_fkey(name, inn)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['supplier-rfq-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfq_items')
        .select('*, materials!rfq_items_material_id_fkey(name)')
        .eq('rfq_id', id!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  if (rfqLoading) return <DashboardLayout mode="supplier"><p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p></DashboardLayout>;
  if (!rfq) return <DashboardLayout mode="supplier"><p className="py-16 text-center text-sm text-muted-foreground">Запрос не найден</p></DashboardLayout>;

  const buyer = (rfq as any).companies;

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div>
          <Link to="/supplier" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Обзор
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">{rfq.title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Формирование КП к запросу</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={rfq.status} />
              {rfq.needed_by && (
                <div className="flex items-center gap-1 text-xs text-warning font-medium">
                  <Clock className="h-3 w-3" /> До {fmtDate(rfq.needed_by)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buyer info */}
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

        {/* Items table */}
        <div className="card-panel">
          <div className="px-5 pt-5 pb-0">
            <h3 className="text-base font-semibold text-foreground">Позиции запроса</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Ознакомьтесь с позициями для формирования КП</p>
          </div>
          <div className="p-5">
            {items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Нет позиций</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="table-header px-4 py-2.5 text-left">Материал</th>
                    <th className="table-header px-4 py-2.5 text-right">Запрошено</th>
                    <th className="table-header px-4 py-2.5 text-left">Ед.</th>
                    <th className="table-header px-4 py-2.5 text-left">Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-4 py-3.5 font-medium">{p.material_name ?? (p as any).materials?.name ?? '—'}</td>
                      <td className="px-4 py-3.5 text-right font-medium tabular-nums">{p.quantity}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{p.unit}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{p.comment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="card-panel p-5">
          <h3 className="section-title mb-3">Комментарий к предложению</h3>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
            rows={3}
            placeholder="Условия поставки, особые требования, комментарии для покупателя..."
          />
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" className="text-xs h-8">Сохранить черновик</Button>
            <Button className="gap-2 text-xs h-8"><Send className="h-3.5 w-3.5" /> Отправить КП</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
