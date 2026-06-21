import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, FileText, MapPin, Truck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate, getDashboardMode } from '@/lib/app-utils';
import { createNotificationsForCompanyUsers, createNotificationsForUsers } from '@/lib/notifications';
import type { OrderItem, OrderWithCompanies, Shipment } from '@/types/app';

function buildShipmentNumber() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 900 + 100);
  return `SHP-${datePart}-${randomPart}`;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mode = getDashboardMode(profile?.role);
  const ordersListHref = mode === 'supplier' ? '/supplier' : '/buyer/orders';
  const defaultPlannedDate = useMemo(
    () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    [],
  );
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);
  const [plannedDate, setPlannedDate] = useState(defaultPlannedDate);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [routeNote, setRouteNote] = useState('');

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, companies!orders_supplier_company_id_fkey(name), buyer:companies!orders_buyer_company_id_fkey(name)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as OrderWithCompanies;
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
      return (data ?? []) as OrderItem[];
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
      return (data ?? []) as Shipment[];
    },
    enabled: !!id,
  });

  const resetShipmentForm = () => {
    setPlannedDate(defaultPlannedDate);
    setDriverName('');
    setDriverPhone('');
    setVehicleInfo('');
    setTrackingNumber('');
    setRouteNote('');
  };

  const createShipmentMutation = useMutation({
    mutationFn: async () => {
      if (mode !== 'supplier') {
        throw new Error('Создавать отгрузки может только поставщик.');
      }

      if (!profile?.company_id) {
        throw new Error('Компания поставщика не определена.');
      }

      if (!order) {
        throw new Error('Заказ не загружен.');
      }

      if (!items.length) {
        throw new Error('В заказе нет позиций для отгрузки.');
      }

      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          order_id: order.id,
          supplier_company_id: profile.company_id,
          shipment_number: buildShipmentNumber(),
          status: 'planned',
          planned_date: plannedDate || null,
          driver_name: driverName.trim() || null,
          driver_phone: driverPhone.trim() || null,
          vehicle_info: vehicleInfo.trim() || null,
          tracking_number: trackingNumber.trim() || null,
          route_note: routeNote.trim() || null,
        })
        .select('id, shipment_number')
        .single();

      if (shipmentError || !shipment) {
        throw shipmentError ?? new Error('Не удалось создать отгрузку.');
      }

      const shipmentItemsPayload = items.map((item) => ({
        shipment_id: shipment.id,
        order_item_id: item.id,
        quantity: Number(item.quantity),
      }));

      const { error: shipmentItemsError } = await supabase
        .from('shipment_items')
        .insert(shipmentItemsPayload);

      if (shipmentItemsError) {
        throw shipmentItemsError;
      }

      if (order.status === 'confirmed') {
        const { error: orderStatusError } = await supabase
          .from('orders')
          .update({ status: 'in_progress' })
          .eq('id', order.id);

        if (orderStatusError) {
          console.warn('Не удалось обновить статус заказа после создания отгрузки:', orderStatusError.message);
        }
      }

      const notificationPayload = {
        type: 'shipment' as const,
        title: 'Создана отгрузка по заказу',
        body: `По заказу ${order.order_number ? `#${order.order_number}` : ''} создана новая отгрузка${plannedDate ? ` на ${formatDate(plannedDate)}` : ''}.`,
        related_entity_id: shipment.id,
        related_entity_type: 'shipment',
      };

      if (order.created_by) {
        await createNotificationsForUsers([order.created_by], notificationPayload);
      } else if (order.buyer_company_id) {
        await createNotificationsForCompanyUsers([order.buyer_company_id], notificationPayload);
      }

      return shipment;
    },
    onSuccess: async (shipment) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', id] }),
        queryClient.invalidateQueries({ queryKey: ['order-items', id] }),
        queryClient.invalidateQueries({ queryKey: ['order-shipments', id] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-shipments', profile?.company_id] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-shipments-list', profile?.company_id] }),
        queryClient.invalidateQueries({ queryKey: ['route-shipments', profile?.company_id] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);

      setShipmentDialogOpen(false);
      resetShipmentForm();

      toast({
        title: 'Отгрузка создана',
        description: shipment.shipment_number
          ? `Новая отгрузка #${shipment.shipment_number} добавлена в систему.`
          : 'Новая отгрузка добавлена в систему.',
      });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Не удалось создать отгрузку',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  if (orderLoading) return <DashboardLayout mode={mode}><p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p></DashboardLayout>;
  if (!order) return <DashboardLayout mode={mode}><p className="py-16 text-center text-sm text-muted-foreground">Заказ не найден</p></DashboardLayout>;

  const statusSteps = [
    { label: 'Подтверждён', done: ['confirmed', 'in_progress', 'shipped', 'received', 'closed'].includes(order.status), active: order.status === 'confirmed' },
    { label: 'В работе', done: ['in_progress', 'shipped', 'received', 'closed'].includes(order.status), active: order.status === 'in_progress' },
    { label: 'Отгружен', done: ['shipped', 'received', 'closed'].includes(order.status), active: order.status === 'shipped' },
    { label: 'Получен', done: ['received', 'closed'].includes(order.status), active: order.status === 'received' },
  ];
  const documentItems = [
    { title: `Счёт ${order.order_number ? `#${order.order_number}` : ''}`, kind: 'Счёт' },
    { title: `Спецификация к заказу ${order.order_number ? `#${order.order_number}` : ''}`, kind: 'Спецификация' },
    { title: 'Договор поставки', kind: 'Договор' },
  ];
  const downloadDocument = (title: string) => {
    const lines = [
      'EcaMarket procurement document',
      title,
      `Заказ: ${order.order_number ?? order.id}`,
      `Поставщик: ${order.companies?.name ?? '—'}`,
      `Покупатель: ${order.buyer?.name ?? '—'}`,
      `Сумма: ${formatCurrency(order.total_amount)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.replace(/[^\p{L}\p{N}]+/gu, '_')}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout mode={mode}>
      <div className="demo-page">
        <div>
          <Link to={ordersListHref} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> {mode === 'supplier' ? 'К отгрузкам и заказам' : 'К заказам'}
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Заказ {order.order_number ? `#${order.order_number}` : ''}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {mode === 'buyer' ? `Заказ у ${order.companies?.name ?? 'поставщика'}` : `Заказ от ${order.buyer?.name ?? 'покупателя'}`} · создан {formatDate(order.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.payment_status} />
              {mode === 'supplier' && (
                <Button
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  disabled={createShipmentMutation.isPending || items.length === 0}
                  onClick={() => setShipmentDialogOpen(true)}
                >
                  <Truck className="h-3.5 w-3.5" />
                  Новая отгрузка
                </Button>
              )}
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
                            <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(it.price)}</td>
                            <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatCurrency(it.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <span className="text-xs text-muted-foreground">Итого с НДС</span>
                      <span className="text-xl font-bold tabular-nums">{formatCurrency(order.total_amount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="card-panel">
              <div className="px-5 pt-5 pb-0">
                <h3 className="section-title">Отгрузки</h3>
              </div>
              <div className="p-5 space-y-2">
                {shipments.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Отгрузок пока нет
                  </div>
                ) : (
                  shipments.map((shipment) => (
                    <div key={shipment.id} className="flex items-center justify-between rounded-md border p-3.5">
                      <div>
                        {mode === 'supplier' ? (
                          <Link
                            to={`/supplier/shipments/${shipment.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {shipment.shipment_number || shipment.id.slice(0, 8)}
                          </Link>
                        ) : mode === 'buyer' ? (
                          <Link
                            to={`/buyer/shipments/${shipment.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {shipment.shipment_number || shipment.id.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium">{shipment.shipment_number || shipment.id.slice(0, 8)}</span>
                        )}
                        {shipment.driver_name && (
                          <p className="mt-0.5 text-xs text-muted-foreground">Водитель: {shipment.driver_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{formatDate(shipment.planned_date)}</span>
                        <StatusBadge status={shipment.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
              <h3 className="section-title mb-4">Документы</h3>
              <div className="space-y-3">
                {documentItems.map((documentItem) => (
                  <button
                    key={documentItem.title}
                    className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    onClick={() => downloadDocument(documentItem.title)}
                  >
                    <span className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <span className="block text-sm font-semibold">{documentItem.title}</span>
                        <span className="text-xs text-muted-foreground">{documentItem.kind}</span>
                      </span>
                    </span>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
            <div className="card-panel p-5">
              <h3 className="section-title mb-3">Финансы</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Без НДС</span><span className="tabular-nums">{formatCurrency(order.amount_without_vat)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">НДС</span><span className="tabular-nums">{formatCurrency(order.vat_amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Доставка</span><span className="tabular-nums">{formatCurrency(order.delivery_cost)}</span></div>
                <div className="flex justify-between border-t pt-2 font-semibold"><span>Итого</span><span className="tabular-nums">{formatCurrency(order.total_amount)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={shipmentDialogOpen}
        onOpenChange={(nextOpen) => {
          if (createShipmentMutation.isPending) {
            return;
          }

          setShipmentDialogOpen(nextOpen);

          if (!nextOpen) {
            resetShipmentForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Создание отгрузки</DialogTitle>
            <DialogDescription>
              Новая отгрузка будет создана по текущему заказу и заполнена позициями заказа автоматически.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Плановая дата</Label>
              <Input type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Трек-номер</Label>
              <Input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="TK-458729" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Водитель</Label>
              <Input value={driverName} onChange={(event) => setDriverName(event.target.value)} placeholder="Иван Петров" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Телефон водителя</Label>
              <Input value={driverPhone} onChange={(event) => setDriverPhone(event.target.value)} placeholder="+7 999 123-45-67" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Транспорт</Label>
              <Input value={vehicleInfo} onChange={(event) => setVehicleInfo(event.target.value)} placeholder="MAN TGS · А123ВС 77" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Комментарий к маршруту</Label>
              <textarea
                value={routeNote}
                onChange={(event) => setRouteNote(event.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Контакт на складе, окно разгрузки, особенности проезда..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShipmentDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => createShipmentMutation.mutate()} disabled={createShipmentMutation.isPending || !items.length}>
              {createShipmentMutation.isPending ? 'Создание…' : 'Создать отгрузку'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
