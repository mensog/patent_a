import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { Button } from '@/components/ui/button';
import { Truck, ArrowLeft, MapPin, User, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*, orders!shipments_order_id_fkey(order_number, delivery_address, buyer_company_id, companies!orders_buyer_company_id_fkey(name))')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: shipmentItems = [] } = useQuery({
    queryKey: ['shipment-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_items')
        .select('*, order_items!shipment_items_order_item_id_fkey(material_name, unit)')
        .eq('shipment_id', id!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  if (isLoading) return <DashboardLayout mode="supplier"><p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p></DashboardLayout>;
  if (!shipment) return <DashboardLayout mode="supplier"><p className="py-16 text-center text-sm text-muted-foreground">Отгрузка не найдена</p></DashboardLayout>;

  const order = (shipment as any).orders;
  const statusOrder = ['planned', 'ready', 'in_transit', 'delivered'];
  const currentIdx = statusOrder.indexOf(shipment.status);
  const steps = [
    { label: 'Запланировано', done: currentIdx >= 0, active: shipment.status === 'planned' },
    { label: 'Готов', done: currentIdx >= 1, active: shipment.status === 'ready' },
    { label: 'В пути', done: currentIdx >= 2, active: shipment.status === 'in_transit' },
    { label: 'Доставлено', done: currentIdx >= 3, active: shipment.status === 'delivered' },
  ];

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div>
          <Link to="/supplier" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Обзор
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Отгрузка {shipment.shipment_number ? `#${shipment.shipment_number}` : ''}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                К заказу {order?.order_number ? `#${order.order_number}` : ''} · {order?.companies?.name ?? '—'}
                {order?.delivery_address ? ` · ${order.delivery_address}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={shipment.status} />
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
                <Printer className="h-3 w-3" /> Печать ТТН
              </Button>
              <Button size="sm" className="text-xs h-8 gap-1">
                <Truck className="h-3 w-3" /> Подтвердить отгрузку
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="card-panel p-6">
          <h3 className="section-title mb-6">Статус отгрузки</h3>
          <Timeline steps={steps} />
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="kpi-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Транспорт</p>
                <p className="mt-0.5 text-sm font-semibold">{shipment.vehicle_info || '—'}</p>
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Водитель</p>
                <p className="mt-0.5 text-sm font-semibold">{shipment.driver_name || '—'}</p>
                {shipment.driver_phone && <p className="text-xs text-primary">{shipment.driver_phone}</p>}
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Дата доставки</p>
                <p className="mt-0.5 text-sm font-semibold">{fmtDate(shipment.planned_date)}</p>
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Позиций</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums">{shipmentItems.length}</p>
          </div>
        </div>

        {/* Shipment contents */}
        <div className="card-panel">
          <div className="px-5 pt-5 pb-0">
            <h3 className="section-title">Содержимое отгрузки</h3>
          </div>
          <div className="p-5">
            {shipmentItems.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Нет позиций</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="table-header px-4 py-2.5 text-left">Материал</th>
                    <th className="table-header px-4 py-2.5 text-right">Кол-во</th>
                  </tr>
                </thead>
                <tbody>
                  {shipmentItems.map(it => (
                    <tr key={it.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{(it as any).order_items?.material_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{it.quantity} {(it as any).order_items?.unit ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Route note */}
        {shipment.route_note && (
          <div className="card-panel p-5">
            <h3 className="section-title mb-2">Примечание к маршруту</h3>
            <p className="text-sm text-muted-foreground">{shipment.route_note}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
