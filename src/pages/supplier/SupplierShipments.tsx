import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/app-utils';
import type { ShipmentStatus, ShipmentWithOrder } from '@/types/app';

const filterOptions: Array<{ value: 'all' | ShipmentStatus; label: string; hint: string }> = [
  { value: 'all', label: 'Все', hint: 'полный список' },
  { value: 'planned', label: 'На складе', hint: 'созданы, нужно собрать' },
  { value: 'ready', label: 'Готовы', hint: 'можно передавать водителю' },
  { value: 'in_transit', label: 'В пути', hint: 'ждём подтверждение покупателя' },
  { value: 'delivered', label: 'Получены', hint: 'закрытые поставки' },
];

function nextActionText(status: string) {
  if (status === 'planned') return 'Открыть и отметить готовность склада';
  if (status === 'ready') return 'Открыть и передать водителю';
  if (status === 'in_transit') return 'Ожидает подтверждение покупателя';
  if (status === 'delivered') return 'Поставка получена покупателем';
  return 'Открыть отгрузку';
}

export default function SupplierShipments() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [filter, setFilter] = useState<'all' | ShipmentStatus>('all');

  const { data: shipments = [], isLoading, error } = useQuery({
    queryKey: ['supplier-shipments-list', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error: queryError } = await supabase
        .from('shipments')
        .select(
          '*, orders!shipments_order_id_fkey(order_number, delivery_address, buyer_company_id, companies!orders_buyer_company_id_fkey(name))',
        )
        .eq('supplier_company_id', companyId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      return (data ?? []) as ShipmentWithOrder[];
    },
    enabled: !!companyId,
  });

  const counts = useMemo(() => shipments.reduce<Record<string, number>>((acc, shipment) => {
    acc.all = (acc.all ?? 0) + 1;
    acc[shipment.status] = (acc[shipment.status] ?? 0) + 1;
    return acc;
  }, { all: 0 }), [shipments]);
  const filteredShipments = filter === 'all' ? shipments : shipments.filter((shipment) => shipment.status === filter);

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Управление отгрузками</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Складской процесс: собрать груз → отметить готовность → передать водителю → покупатель подтверждает получение.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`rounded-lg border bg-card p-3 text-left transition-colors ${filter === option.value ? 'border-primary ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}
            >
              <span className="block text-lg font-bold tabular-nums">{counts[option.value] ?? 0}</span>
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-1 block text-[11px] text-muted-foreground">{option.hint}</span>
            </button>
          ))}
        </div>

        <div className="card-panel">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : error ? (
            <p className="py-16 text-center text-sm text-destructive">Не удалось загрузить список отгрузок.</p>
          ) : filteredShipments.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">По выбранному фильтру отгрузок нет</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="table-header px-5 py-3 text-left">Заказ / отгрузка</th>
                  <th className="table-header px-5 py-3 text-left">Покупатель</th>
                  <th className="table-header px-5 py-3 text-left">Адрес доставки</th>
                  <th className="table-header px-5 py-3 text-center">Этап</th>
                  <th className="table-header px-5 py-3 text-right">Плановая дата</th>
                  <th className="table-header px-5 py-3 text-right">Действие</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to={`/supplier/shipments/${shipment.id}`} className="font-medium text-foreground transition-colors hover:text-primary">
                        {shipment.orders?.order_number ? `Заказ #${shipment.orders.order_number}` : 'Заказ'} · {shipment.shipment_number ?? shipment.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{shipment.orders?.companies?.name ?? '—'}</td>
                    <td className="max-w-xs truncate px-5 py-3.5 text-muted-foreground">{shipment.orders?.delivery_address ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center"><StatusBadge status={shipment.status} /></td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground">{formatDate(shipment.planned_date)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                        <Link to={`/supplier/shipments/${shipment.id}`}>{nextActionText(shipment.status)}</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
