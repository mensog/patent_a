import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { ArrowLeft, Truck, MapPin } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, companies!orders_supplier_company_id_fkey(name), buyer:companies!orders_buyer_company_id_fkey(name)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['order-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['order-shipments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('order_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  if (orderLoading) return <DashboardLayout mode="buyer"><p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p></DashboardLayout>;
  if (!order) return <DashboardLayout mode="buyer"><p className="py-16 text-center text-sm text-muted-foreground">Заказ не найден</p></DashboardLayout>;

  const statusSteps = [
    { label: 'Подтверждён', done: ['confirmed', 'in_progress', 'shipped', 'received', 'closed'].includes(order.status), active: order.status === 'confirmed' },
    { label: 'В работе', done: ['in_progress', 'shipped', 'received', 'closed'].includes(order.status), active: order.status === 'in_progress' },
    { label: 'Отгружен', done: ['shipped', 'received', 'closed'].includes(order.status), active: order.status === 'shipped' },
    { label: 'Получен', done: ['received', 'closed'].includes(order.status), active: order.status === 'received' },
  ];

  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div>
          <Link to="/buyer" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Обзор
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Заказ {order.order_number ? `#${order.order_number}` : ''}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {(order as any).companies?.name ?? '—'} · создан {fmtDate(order.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.payment_status} />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="card-panel p-6">
          <h3 className="section-title mb-6">Прогресс заказа</h3>
          <Timeline steps={statusSteps} />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Order items */}
            <div className="card-panel">
              <div className="px-5 pt-5 pb-0 flex items-center justify-between">
                <h3 className="section-title">Позиции заказа</h3>
                <span className="text-xs text-muted-foreground">{items.length} позиции</span>
              </div>
              <div className="p-5">
                {items.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground text-center">Нет позиций</p>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="table-header px-4 py-2.5 text-left">Материал</th>
                          <th className="table-header px-4 py-2.5 text-right">Кол-во</th>
                          <th className="table-header px-4 py-2.5 text-right">Цена</th>
                          <th className="table-header px-4 py-2.5 text-right">Сумма</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(it => (
                          <tr key={it.id} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">{it.material_name}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{it.quantity} {it.unit}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{Number(it.price).toLocaleString('ru-RU')} ₽</td>
                            <td className="px-4 py-3 text-right tabular-nums font-semibold">{Number(it.line_total).toLocaleString('ru-RU')} ₽</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <span className="text-xs text-muted-foreground">Итого с НДС</span>
                      <span className="text-xl font-bold tabular-nums">{Number(order.total_amount).toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Shipments */}
            {shipments.length > 0 && (
              <div className="card-panel">
                <div className="px-5 pt-5 pb-0">
                  <h3 className="section-title">Отгрузки</h3>
                </div>
                <div className="p-5 space-y-2">
                  {shipments.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-md border p-3.5">
                      <div>
                        <span className="text-sm font-medium">{s.shipment_number || s.id.slice(0, 8)}</span>
                        {s.driver_name && <p className="text-xs text-muted-foreground mt-0.5">Водитель: {s.driver_name}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{fmtDate(s.planned_date)}</span>
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {order.delivery_address && (
              <div className="card-panel p-5">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Адрес доставки</span>
                </div>
                <p className="text-sm font-medium">{order.delivery_address}</p>
              </div>
            )}
            <div className="card-panel p-5">
              <h3 className="section-title mb-3">Финансы</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Без НДС</span><span className="tabular-nums">{Number(order.amount_without_vat).toLocaleString('ru-RU')} ₽</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">НДС</span><span className="tabular-nums">{Number(order.vat_amount).toLocaleString('ru-RU')} ₽</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Доставка</span><span className="tabular-nums">{Number(order.delivery_cost).toLocaleString('ru-RU')} ₽</span></div>
                <div className="flex justify-between border-t pt-2 font-semibold"><span>Итого</span><span className="tabular-nums">{Number(order.total_amount).toLocaleString('ru-RU')} ₽</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
