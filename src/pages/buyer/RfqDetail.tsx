import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function RfqDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: rfq, isLoading: rfqLoading } = useQuery({
    queryKey: ['rfq', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfqs')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['rfq-items', id],
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

  const { data: quotes = [] } = useQuery({
    queryKey: ['rfq-quotes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, companies!quotes_supplier_company_id_fkey(name), quote_items(*)')
        .eq('rfq_id', id!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  if (rfqLoading) return <DashboardLayout mode="buyer"><p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p></DashboardLayout>;
  if (!rfq) return <DashboardLayout mode="buyer"><p className="py-16 text-center text-sm text-muted-foreground">Запрос не найден</p></DashboardLayout>;

  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div>
          <Link to="/buyer/rfq" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Все запросы
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">{rfq.title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Создан {fmtDate(rfq.created_at)} · Дедлайн {fmtDate(rfq.needed_by)}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={rfq.status} />
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
                <Download className="h-3 w-3" /> Экспорт
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Позиции</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums">{items.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Получено КП</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-primary">{quotes.length}</p>
          </div>
          {quotes.length > 0 && (
            <div className="kpi-card">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Мин. сумма КП</p>
              <p className="mt-1.5 text-xl font-bold tabular-nums text-success">
                {Math.min(...quotes.map(q => Number(q.total_amount ?? 0))).toLocaleString('ru-RU')} ₽
              </p>
            </div>
          )}
        </div>

        {rfq.description && (
          <div className="card-panel p-5">
            <h3 className="section-title mb-2">Описание</h3>
            <p className="text-sm text-muted-foreground">{rfq.description}</p>
          </div>
        )}

        {/* Positions */}
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
                  {items.map((p, i) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{p.material_name ?? (p as any).materials?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.quantity}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quotes */}
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
                  </tr>
                </thead>
                <tbody>
                  {quotes.sort((a, b) => Number(a.total_amount ?? 0) - Number(b.total_amount ?? 0)).map(q => (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3.5 font-semibold">{(q as any).companies?.name ?? '—'}</td>
                      <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                        {Number(q.total_amount ?? 0).toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                        {Number(q.delivery_cost ?? 0).toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">{fmtDate(q.valid_until)}</td>
                      <td className="px-4 py-3.5 text-center"><StatusBadge status={q.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
