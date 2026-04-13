import { DashboardLayout } from '@/components/DashboardLayout';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { KPI } from '@/data/mock';

export default function SupplierDashboard() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: rfqInvites = [], isLoading: rfqLoading } = useQuery({
    queryKey: ['supplier-rfq-invites', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data: invites } = await supabase
        .from('rfq_suppliers')
        .select('rfq_id')
        .eq('supplier_company_id', companyId);
      if (!invites?.length) return [];
      const rfqIds = invites.map(i => i.rfq_id);
      const { data, error } = await supabase
        .from('rfqs')
        .select('id, title, status, needed_by, created_at, buyer_company_id, companies!rfqs_buyer_company_id_fkey(name)')
        .in('id', rfqIds)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['supplier-shipments', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('shipments')
        .select('id, shipment_number, status, planned_date, order_id, orders!shipments_order_id_fkey(order_number, buyer_company_id, companies!orders_buyer_company_id_fkey(name), delivery_address)')
        .eq('supplier_company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['supplier-offers-summary', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('supplier_offers')
        .select('id, price, stock, is_active, material_id, materials!supplier_offers_material_id_fkey(name)')
        .eq('supplier_company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: company } = useQuery({
    queryKey: ['my-company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from('companies').select('name, inn').eq('id', companyId).single();
      return data;
    },
    enabled: !!companyId,
  });

  const kpis: KPI[] = [
    { label: 'Запросы (приглашения)', value: String(rfqInvites.length), changeType: 'neutral' },
    { label: 'Отгрузки', value: String(shipments.length), changeType: 'neutral' },
    { label: 'Предложений', value: String(offers.length), changeType: 'neutral' },
  ];

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';
  const loading = rfqLoading || shipmentsLoading;

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Центр управления</h1>
            {company && <p className="mt-0.5 text-sm text-muted-foreground">{company.name}{company.inn ? ` · ИНН ${company.inn}` : ''}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/supplier/import">
              <Button size="sm" className="text-xs h-8 gap-1">
                <Package className="h-3 w-3" /> Обновить прайс
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {kpis.map((k, i) => <KPICard key={i} kpi={k} />)}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Shipments */}
          <div className="col-span-2 card-panel">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <h3 className="section-title">Отгрузки и доставки</h3>
              <Link to="/supplier/routes" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Маршруты <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-5">
              {shipmentsLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка…</p>
              ) : shipments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет отгрузок</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="table-header px-4 py-2.5 text-left">Отгрузка</th>
                      <th className="table-header px-4 py-2.5 text-left">Клиент</th>
                      <th className="table-header px-4 py-2.5 text-left">Дата</th>
                      <th className="table-header px-4 py-2.5 text-center">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map(s => {
                      const order = (s as any).orders;
                      return (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3">
                            <Link to={`/supplier/shipments/${s.id}`} className="text-xs font-mono font-medium text-primary">
                              {s.shipment_number || s.id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-medium">{order?.companies?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(s.planned_date)}</td>
                          <td className="px-4 py-3 text-center"><StatusBadge status={s.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Offers summary */}
          <div className="card-panel">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <h3 className="section-title">Каталог предложений</h3>
              <Link to="/supplier/offers" className="text-xs font-medium text-primary hover:underline">Все →</Link>
            </div>
            <div className="p-5 space-y-2">
              {offersLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка…</p>
              ) : offers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет предложений</p>
              ) : (
                offers.map(o => (
                  <div key={o.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{(o as any).materials?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">Остаток: {o.stock ?? 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{Number(o.price).toLocaleString('ru-RU')} ₽</p>
                      <span className={`inline-flex h-1.5 w-1.5 rounded-full ${o.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
