import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/app-utils';
import type { BuyerOrderListItem } from '@/types/app';

export default function BuyerOrders() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['buyer-orders-list', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error: queryError } = await supabase
        .from('orders')
        .select(
          'id, order_number, status, payment_status, total_amount, created_at, companies!orders_supplier_company_id_fkey(name)',
        )
        .eq('buyer_company_id', companyId)
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      return (data ?? []) as BuyerOrderListItem[];
    },
    enabled: !!companyId,
  });

  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Заказы</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{orders.length} записей</p>
        </div>

        <div className="card-panel">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : error ? (
            <p className="py-16 text-center text-sm text-destructive">Не удалось загрузить список заказов.</p>
          ) : orders.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Заказов пока нет</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="table-header px-5 py-3 text-left">Заказ</th>
                  <th className="table-header px-5 py-3 text-left">Поставщик</th>
                  <th className="table-header px-5 py-3 text-center">Статус</th>
                  <th className="table-header px-5 py-3 text-center">Оплата</th>
                  <th className="table-header px-5 py-3 text-right">Сумма</th>
                  <th className="table-header px-5 py-3 text-right">Дата</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/buyer/orders/${order.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {order.order_number ? `Заказ #${order.order_number}` : `Заказ ${order.id.slice(0, 8)}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{order.companies?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground">{formatDate(order.created_at)}</td>
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
