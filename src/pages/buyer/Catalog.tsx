import { DashboardLayout } from '@/components/DashboardLayout';
import { materials, categories, suppliers } from '@/data/mock';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Search, ArrowRight, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';

export default function Catalog() {
  const [cat, setCat] = useState('Все');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const filtered = materials.filter(m =>
    (cat === 'Все' || m.category === cat) &&
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Каталог материалов</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{materials.length} позиций · {suppliers.length} поставщиков · Обновлено 13.03.2025</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border p-0.5">
            <button onClick={() => setView('table')} className={`rounded p-1.5 transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <List className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setView('grid')} className={`rounded p-1.5 transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border bg-card px-3 py-2 flex-1 max-w-md">
            <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Наименование, ГОСТ, категория..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${cat === c ? 'bg-primary text-primary-foreground' : 'border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {view === 'table' ? (
          <div className="card-panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="table-header px-5 py-3 text-left">Наименование</th>
                  <th className="table-header px-5 py-3 text-left">Категория</th>
                  <th className="table-header px-5 py-3 text-left">ГОСТ / ТУ</th>
                  <th className="table-header px-5 py-3 text-left">Ед. изм.</th>
                  <th className="table-header px-5 py-3 text-right">Мин. заказ</th>
                  <th className="table-header px-5 py-3 text-right">Поставщиков</th>
                  <th className="table-header px-5 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <Link to={`/buyer/material/${m.id}`} className="font-medium text-foreground group-hover:text-primary transition-colors">{m.name}</Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{m.category}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{m.gost || '—'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{m.unit}</td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground tabular-nums">{m.minOrder}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="tabular-nums font-medium">{Math.min(m.id + 1, 5)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link to={`/buyer/material/${m.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                        Сравнить цены <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">Ничего не найдено</p>
                <p className="mt-1 text-xs text-muted-foreground">Попробуйте изменить параметры поиска или выбрать другую категорию</p>
                <button onClick={() => { setCat('Все'); setSearch(''); }} className="mt-3 text-xs font-medium text-primary hover:underline">Сбросить фильтры</button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(m => (
              <Link key={m.id} to={`/buyer/material/${m.id}`} className="card-panel p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between">
                  <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{m.category}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{m.gost}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">{m.name}</h3>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Ед.: {m.unit}</span>
                  <span>Мин.: {m.minOrder}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">{Math.min(m.id + 1, 5)} поставщиков</span>
                  <span className="text-xs font-medium text-primary flex items-center gap-1">Сравнить <ArrowRight className="h-3 w-3" /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
