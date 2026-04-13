import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function MaterialDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: material, isLoading: matLoading } = useQuery({
    queryKey: ['material', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*, material_categories!materials_category_id_fkey(name)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['material-offers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_offers')
        .select('*, companies!supplier_offers_supplier_company_id_fkey(name)')
        .eq('material_id', id!)
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const loading = matLoading || offersLoading;

  if (loading) return <DashboardLayout mode="buyer"><p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p></DashboardLayout>;
  if (!material) return <DashboardLayout mode="buyer"><p className="py-16 text-center text-sm text-muted-foreground">Материал не найден</p></DashboardLayout>;

  const bestPrice = offers.length > 0 ? Math.min(...offers.map(o => Number(o.price))) : null;

  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div>
          <Link to="/buyer/catalog" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Каталог
          </Link>
          <h1 className="page-title">{material.name}</h1>
          <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
              {(material as any).material_categories?.name ?? '—'}
            </span>
            {material.sku && <span className="font-mono text-xs">{material.sku}</span>}
            <span>·</span>
            <span>Ед.: {material.unit}</span>
          </div>
        </div>

        {material.description && (
          <div className="card-panel p-5">
            <p className="text-sm text-muted-foreground">{material.description}</p>
          </div>
        )}

        {/* Price summary */}
        {offers.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="kpi-card">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Лучшая цена</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-success">{bestPrice?.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="kpi-card">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Предложений</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums">{offers.length}</p>
            </div>
            <div className="kpi-card">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Мин. срок поставки</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums">
                {Math.min(...offers.map(o => o.lead_time_days ?? 999))} дн.
              </p>
            </div>
          </div>
        )}

        {/* Offers table */}
        <div className="card-panel">
          <div className="px-5 pt-5 pb-0">
            <h3 className="text-base font-semibold text-foreground">Предложения поставщиков</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{offers.length} предложений</p>
          </div>
          <div className="p-5">
            {offers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Нет активных предложений</p>
            ) : (
              <div className="space-y-3">
                {offers.map((o, idx) => {
                  const isBest = Number(o.price) === bestPrice;
                  return (
                    <div key={o.id} className={`rounded-lg border p-4 transition-colors ${isBest ? 'border-success/40 bg-success/[0.03] ring-1 ring-success/20' : 'hover:bg-muted/40'}`}>
                      <div className="flex items-center gap-6">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 ${isBest ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {idx + 1}
                        </div>
                        <div className="min-w-[200px]">
                          <span className="text-sm font-semibold text-foreground">{(o as any).companies?.name ?? '—'}</span>
                          {isBest && <span className="ml-2 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success uppercase">Лучшая цена</span>}
                        </div>
                        <div className="text-right min-w-[120px]">
                          <span className={`text-lg font-bold tabular-nums ${isBest ? 'text-success' : 'text-foreground'}`}>
                            {Number(o.price).toLocaleString('ru-RU')} ₽
                          </span>
                          <p className="text-[10px] text-muted-foreground">НДС {o.vat_rate}%</p>
                        </div>
                        <div className="flex items-center gap-6 flex-1 text-sm">
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Мин. объём</p>
                            <p className="font-medium tabular-nums">{o.min_volume ?? '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Остаток</p>
                            <p className="font-medium tabular-nums">{o.stock ?? '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Срок</p>
                            <p className="font-medium tabular-nums">{o.lead_time_days ?? '—'} дн.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
