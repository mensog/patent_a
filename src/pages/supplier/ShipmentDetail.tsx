import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { Button } from '@/components/ui/button';
import { Truck, ArrowLeft, MapPin, User, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getDashboardMode } from '@/lib/app-utils';
import type { ShipmentItemWithOrderItem, ShipmentStatus, ShipmentWithOrder } from '@/types/app';

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mode = getDashboardMode(profile?.role);
  const isSupplierMode = mode === 'supplier';

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*, orders!shipments_order_id_fkey(order_number, delivery_address, buyer_company_id, companies!orders_buyer_company_id_fkey(name))')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as ShipmentWithOrder;
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
      return (data ?? []) as ShipmentItemWithOrderItem[];
    },
    enabled: !!id,
  });

  const advanceShipmentMutation = useMutation({
    mutationFn: async () => {
      if (!shipment) {
        throw new Error('Отгрузка не загружена.');
      }
      if (!isSupplierMode) {
        throw new Error('Только поставщик может менять статус отгрузки.');
      }

      let nextStatus: ShipmentStatus = shipment.status;
      const patch: Partial<ShipmentWithOrder> = {};

      if (shipment.status === 'planned' || shipment.status === 'ready') {
        nextStatus = 'in_transit';
        patch.shipped_at = new Date().toISOString();
      } else if (shipment.status === 'in_transit') {
        nextStatus = 'delivered';
        patch.delivered_at = new Date().toISOString();
      } else {
        throw new Error('Для текущего статуса действие недоступно.');
      }

      const { error } = await supabase
        .from('shipments')
        .update({ status: nextStatus, shipped_at: patch.shipped_at ?? shipment.shipped_at, delivered_at: patch.delivered_at ?? shipment.delivered_at })
        .eq('id', shipment.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shipment', id] }),
        queryClient.invalidateQueries({ queryKey: ['shipment-items', id] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-shipments'] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-shipments-list'] }),
        queryClient.invalidateQueries({ queryKey: ['route-shipments'] }),
        queryClient.invalidateQueries({ queryKey: ['order', shipment?.order_id] }),
        queryClient.invalidateQueries({ queryKey: ['order-shipments', shipment?.order_id] }),
        queryClient.invalidateQueries({ queryKey: ['buyer-orders-list'] }),
      ]);
      toast({ title: 'Статус отгрузки обновлён' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Не удалось обновить отгрузку',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) return <DashboardLayout mode={mode}><p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p></DashboardLayout>;
  if (!shipment) return <DashboardLayout mode={mode}><p className="py-16 text-center text-sm text-muted-foreground">Отгрузка не найдена</p></DashboardLayout>;

  const order = shipment.orders;
  const statusOrder = ['planned', 'ready', 'in_transit', 'delivered'];
  const currentIdx = statusOrder.indexOf(shipment.status);
  const steps = [
    { label: 'Запланировано', done: currentIdx >= 0, active: shipment.status === 'planned' },
    { label: 'Готов', done: currentIdx >= 1, active: shipment.status === 'ready' },
    { label: 'В пути', done: currentIdx >= 2, active: shipment.status === 'in_transit' },
    { label: 'Доставлено', done: currentIdx >= 3, active: shipment.status === 'delivered' },
  ];
  const canAdvance = isSupplierMode && (shipment.status === 'planned' || shipment.status === 'ready' || shipment.status === 'in_transit');
  const actionLabel =
    shipment.status === 'in_transit' ? 'Подтвердить доставку' : 'Подтвердить отгрузку';
  const backHref = isSupplierMode ? '/supplier/shipments' : `/buyer/orders/${shipment.order_id}`;
  const backLabel = isSupplierMode ? 'Все отгрузки' : 'К заказу';

  return (
    <DashboardLayout mode={mode}>
      <div className="space-y-6">
        <div>
          <Link to={backHref} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> {backLabel}
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
              {isSupplierMode && (
                <>
                  <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
                    <Printer className="h-3 w-3" /> Печать ТТН
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs h-8 gap-1"
                    disabled={!canAdvance || advanceShipmentMutation.isPending}
                    onClick={() => advanceShipmentMutation.mutate()}
                  >
                    <Truck className="h-3 w-3" /> {advanceShipmentMutation.isPending ? 'Сохранение…' : actionLabel}
                  </Button>
                </>
              )}
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
                <p className="mt-0.5 text-sm font-semibold">{formatDate(shipment.planned_date)}</p>
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
                      <td className="px-4 py-3 font-medium">{it.order_items?.material_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{it.quantity} {it.order_items?.unit ?? ''}</td>
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
