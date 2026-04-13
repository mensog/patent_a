import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { MapPin, Clock, Truck, Navigation, Zap, Weight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function RoutePlanning() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['route-shipments', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('shipments')
        .select('*, orders!shipments_order_id_fkey(order_number, delivery_address, buyer_company_id, companies!orders_buyer_company_id_fkey(name))')
        .eq('supplier_company_id', companyId)
        .in('status', ['planned', 'ready', 'in_transit'])
        .order('planned_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Планирование маршрутов</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{shipments.length} точек доставки</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2 text-xs h-8"><Zap className="h-3.5 w-3.5" /> Оптимизировать маршрут</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Точек доставки</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{shipments.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Активных отгрузок</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{shipments.filter(s => s.status === 'in_transit').length}</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Map placeholder */}
          <div className="col-span-3 card-panel overflow-hidden">
            <div className="flex h-[460px] items-center justify-center bg-muted/20 relative">
              <div className="absolute inset-4 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary/8">
                    <Navigation className="h-7 w-7 text-primary" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-foreground">Карта маршрутов</p>
                  <p className="mt-1.5 text-xs text-muted-foreground max-w-[220px]">Интеграция с картами</p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery points */}
          <div className="col-span-2 card-panel">
            <div className="px-5 pt-5 pb-0">
              <h3 className="section-title">Точки доставки</h3>
            </div>
            <div className="p-5 space-y-2.5">
              {isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка…</p>
              ) : shipments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет запланированных отгрузок</p>
              ) : (
                shipments.map((s, i) => {
                  const order = (s as any).orders;
                  return (
                    <div key={s.id} className="rounded-md border p-3.5 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                          <span className="text-xs font-mono text-primary font-medium">{s.shipment_number || s.id.slice(0, 8)}</span>
                        </div>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="text-sm font-medium text-foreground leading-snug">{order?.companies?.name ?? '—'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{order?.delivery_address ?? '—'}</p>
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDate(s.planned_date)}</span>
                        {s.driver_name && <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {s.driver_name}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
