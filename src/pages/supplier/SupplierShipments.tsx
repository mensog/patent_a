import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/app-utils';
import type { ShipmentWithOrder } from '@/types/app';

export default function SupplierShipments() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

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

      if (queryError) {
        throw queryError;
      }

      return (data ?? []) as ShipmentWithOrder[];
    },
    enabled: !!companyId,
  });

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Отгрузки</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{shipments.length} записей</p>
        </div>

        <div className="card-panel">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : error ? (
            <p className="py-16 text-center text-sm text-destructive">Не удалось загрузить список отгрузок.</p>
          ) : shipments.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Отгрузок пока нет</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="table-header px-5 py-3 text-left">Отгрузка</th>
                  <th className="table-header px-5 py-3 text-left">Клиент</th>
                  <th className="table-header px-5 py-3 text-left">Адрес</th>
                  <th className="table-header px-5 py-3 text-center">Статус</th>
                  <th className="table-header px-5 py-3 text-right">План</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/supplier/shipments/${shipment.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {shipment.shipment_number ? `Отгрузка #${shipment.shipment_number}` : shipment.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{shipment.orders?.companies?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{shipment.orders?.delivery_address ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={shipment.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground">{formatDate(shipment.planned_date)}</td>
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
