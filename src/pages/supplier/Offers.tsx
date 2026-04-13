import { DashboardLayout } from '@/components/DashboardLayout';
import { supplierOffers } from '@/data/mock';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Pencil, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const enrichedOffers = supplierOffers.map((o, i) => ({
  ...o,
  views: [34, 28, 45, 12, 38, 22][i] || 0,
  rfqCount: [6, 4, 8, 0, 5, 3][i] || 0,
  priceChange: ['+1.2%', '-0.5%', '+2.1%', '0%', '+0.8%', '-1.3%'][i] || '0%',
  priceDir: ['up', 'down', 'up', 'flat', 'up', 'down'][i] as 'up' | 'down' | 'flat',
  competitorAvg: ['50 200', '64 100', '54 800', '56 000', '63 900', '55 100'][i],
}));

export default function Offers() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const filtered = enrichedOffers.filter(o =>
    o.material.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || (filter === 'active' ? o.active : !o.active))
  );

  const activeCount = supplierOffers.filter(o => o.active).length;
  const totalStock = supplierOffers.filter(o => o.active).reduce((s, o) => s + parseInt(o.stock), 0);

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Управление предложениями</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{supplierOffers.length} позиций · {activeCount} в наличии · Общий остаток: {totalStock} т</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 text-xs h-8">Массовое редактирование</Button>
            <Button className="gap-2 text-xs h-8"><Plus className="h-3.5 w-3.5" /> Добавить позицию</Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Позиций в каталоге</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{supplierOffers.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Просмотры за неделю</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{enrichedOffers.reduce((s, o) => s + o.views, 0)}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Запросы по каталогу</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{enrichedOffers.reduce((s, o) => s + o.rfqCount, 0)}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Средняя цена, ₽/т</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{Math.round(supplierOffers.reduce((s, o) => s + parseInt(o.price.replace(/\s/g, '')), 0) / supplierOffers.length).toLocaleString('ru-RU')}</p>
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
              {f === 'all' ? `Все (${supplierOffers.length})` : f === 'active' ? `В наличии (${activeCount})` : `Нет (${supplierOffers.length - activeCount})`}
            </button>
          ))}
        </div>

        <div className="card-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="table-header px-5 py-3 text-left">Наименование</th>
                <th className="table-header px-5 py-3 text-right">Ваша цена</th>
                <th className="table-header px-5 py-3 text-right">Ср. рынок</th>
                <th className="table-header px-5 py-3 text-right">Δ Цена</th>
                <th className="table-header px-5 py-3 text-right">Остаток</th>
                <th className="table-header px-5 py-3 text-right">Просмотры</th>
                <th className="table-header px-5 py-3 text-right">Запросы</th>
                <th className="table-header px-5 py-3 text-left">Обновлено</th>
                <th className="table-header px-5 py-3 text-center">Статус</th>
                <th className="table-header px-5 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors group">
                  <td className="px-5 py-3.5 font-medium">{o.material}</td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{o.price} ₽</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{o.competitorAvg} ₽</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${o.priceDir === 'up' ? 'text-success' : o.priceDir === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {o.priceDir === 'up' ? <TrendingUp className="h-3 w-3" /> : o.priceDir === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {o.priceChange}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-muted-foreground tabular-nums">{o.stock}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{o.views}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-medium">{o.rfqCount}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{o.lastUpdated}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${o.active ? 'bg-success/8 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${o.active ? 'bg-success' : 'bg-muted-foreground'}`} />
                      {o.active ? 'Активна' : 'Нет'}
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
        </div>
      </div>
    </DashboardLayout>
  );
}
