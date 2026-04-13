import { DashboardLayout } from '@/components/DashboardLayout';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function Offers() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['supplier-all-offers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('supplier_offers')
        .select('*, materials!supplier_offers_material_id_fkey(name)')
        .eq('supplier_company_id', companyId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const filtered = offers.filter(o => {
    const name = (o as any).materials?.name ?? '';
    const matchSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'active' ? o.is_active : !o.is_active);
    return matchSearch && matchFilter;
  });

  const activeCount = offers.filter(o => o.is_active).length;

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Управление предложениями</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{offers.length} позиций · {activeCount} активных</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2 text-xs h-8"><Plus className="h-3.5 w-3.5" /> Добавить позицию</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Всего позиций</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{offers.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Активных</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-success">{activeCount}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Средняя цена</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">
              {offers.length > 0 ? Math.round(offers.reduce((s, o) => s + Number(o.price), 0) / offers.length).toLocaleString('ru-RU') : '—'} ₽
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border bg-card px-3 py-2 flex-1 max-w-sm">
            <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по наименованию..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            >
              {f === 'all' ? `Все (${offers.length})` : f === 'active' ? `Активные (${activeCount})` : `Неактивные (${offers.length - activeCount})`}
            </button>
          ))}
        </div>

        <div className="card-panel">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="table-header px-5 py-3 text-left">Наименование</th>
                    <th className="table-header px-5 py-3 text-right">Цена</th>
                    <th className="table-header px-5 py-3 text-right">Остаток</th>
                    <th className="table-header px-5 py-3 text-right">Мин. объём</th>
                    <th className="table-header px-5 py-3 text-right">Срок, дн.</th>
                    <th className="table-header px-5 py-3 text-center">Статус</th>
                    <th className="table-header px-5 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors group">
                      <td className="px-5 py-3.5 font-medium">{(o as any).materials?.name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{Number(o.price).toLocaleString('ru-RU')} ₽</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{o.stock ?? 0}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{o.min_volume ?? '—'}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{o.lead_time_days ?? '—'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${o.is_active ? 'bg-success/8 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${o.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
                          {o.is_active ? 'Активна' : 'Нет'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-16 text-center">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground">Позиции не найдены</p>
                  <p className="mt-1 text-xs text-muted-foreground">Измените параметры фильтрации</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
