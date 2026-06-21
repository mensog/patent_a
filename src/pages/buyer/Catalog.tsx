import { DashboardLayout } from '@/components/DashboardLayout';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Search, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { MaterialCategory, MaterialWithCategory } from '@/types/app';

type SortMode = 'name' | 'price' | 'offers';

interface OfferSummary {
  material_id: string;
  price: number;
  min_volume: number | null;
  stock: number | null;
}

export default function Catalog() {
  const [cat, setCat] = useState('Все');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('name');
  const [onlyWithOffers, setOnlyWithOffers] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['material-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('material_categories').select('id, name').order('name');
      if (error) throw error;
      return (data ?? []) as Pick<MaterialCategory, 'id' | 'name'>[];
    },
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('id, name, sku, unit, description, category_id, material_categories!materials_category_id_fkey(name)')
        .order('name');
      if (error) throw error;
      return (data ?? []) as MaterialWithCategory[];
    },
  });

  const { data: offerSummaries = [] } = useQuery({
    queryKey: ['catalog-offer-summaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_offers')
        .select('material_id, price, min_volume, stock')
        .eq('is_active', true)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as OfferSummary[];
    },
  });

  const catNames = ['Все', ...categories.map(c => c.name)];
  const selectedCatId = categories.find(c => c.name === cat)?.id;
  const offersByMaterial = useMemo(() => {
    return offerSummaries.reduce<Record<string, { count: number; minPrice: number; minVolume: number | null; stock: number }>>((acc, offer) => {
      const current = acc[offer.material_id] ?? { count: 0, minPrice: Number.POSITIVE_INFINITY, minVolume: null, stock: 0 };
      current.count += 1;
      current.minPrice = Math.min(current.minPrice, Number(offer.price));
      current.stock += Number(offer.stock ?? 0);
      if (offer.min_volume !== null) {
        current.minVolume = current.minVolume === null ? Number(offer.min_volume) : Math.min(current.minVolume, Number(offer.min_volume));
      }
      acc[offer.material_id] = current;
      return acc;
    }, {});
  }, [offerSummaries]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return materials
      .filter(m => {
        const summary = offersByMaterial[m.id];
        const matchCat = cat === 'Все' || m.category_id === selectedCatId;
        const matchSearch =
          !normalizedSearch ||
          m.name.toLowerCase().includes(normalizedSearch) ||
          (m.sku ?? '').toLowerCase().includes(normalizedSearch) ||
          (m.description ?? '').toLowerCase().includes(normalizedSearch);
        const matchOffers = !onlyWithOffers || (summary?.count ?? 0) > 0;
        return matchCat && matchSearch && matchOffers;
      })
      .sort((left, right) => {
        const leftSummary = offersByMaterial[left.id];
        const rightSummary = offersByMaterial[right.id];
        if (sort === 'price') {
          return (leftSummary?.minPrice ?? Number.POSITIVE_INFINITY) - (rightSummary?.minPrice ?? Number.POSITIVE_INFINITY);
        }
        if (sort === 'offers') {
          return (rightSummary?.count ?? 0) - (leftSummary?.count ?? 0);
        }
        return left.name.localeCompare(right.name, 'ru');
      });
  }, [cat, materials, offersByMaterial, onlyWithOffers, search, selectedCatId, sort]);

  return (
    <DashboardLayout mode="buyer">
      <div className="demo-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Каталог материалов</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{materials.length} позиций</p>
          </div>
        </div>

        <div className="card-panel space-y-3 p-4">
          <div className="flex h-10 min-w-72 flex-1 items-center rounded-md border bg-card px-3 shadow-sm">
            <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Фильтры
            </span>
            <select value={cat} onChange={(event) => setCat(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              {catNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="name">Сортировка: название</option>
              <option value="price">Сначала дешевле</option>
              <option value="offers">Больше предложений</option>
            </select>
            <label className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground">
              <input type="checkbox" checked={onlyWithOffers} onChange={(event) => setOnlyWithOffers(event.target.checked)} />
              Только с предложениями
            </label>
            {(search || cat !== 'Все' || onlyWithOffers || sort !== 'name') && (
              <button onClick={() => { setCat('Все'); setSearch(''); setOnlyWithOffers(false); setSort('name'); }} className="text-xs font-medium text-primary hover:underline">
                Сбросить
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => {
              const summary = offersByMaterial[m.id];
              return (
              <Link key={m.id} to={`/buyer/material/${m.id}`} className="card-panel flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/30">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-foreground">{m.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {m.material_categories?.name ?? 'Без категории'} · Ед.: {m.unit}{m.sku ? ` · ${m.sku}` : ''}
                  </p>
                </div>
                <div className="grid shrink-0 grid-cols-3 items-center gap-6 text-right">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Лучшая цена</p>
                    <p className="text-sm font-semibold tabular-nums">{summary ? `${summary.minPrice.toLocaleString('ru-RU')} ₽` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Предложений</p>
                    <p className="text-sm font-semibold tabular-nums">{summary?.count ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Мин. объём: {summary?.minVolume ?? '—'}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Сравнить поставщиков <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  </div>
                </div>
              </Link>
            );
            })}
            {filtered.length === 0 && (
              <div className="card-panel py-16 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">Ничего не найдено</p>
                <p className="mt-1 text-xs text-muted-foreground">Попробуйте изменить параметры поиска</p>
                <button onClick={() => { setCat('Все'); setSearch(''); }} className="mt-3 text-xs font-medium text-primary hover:underline">Сбросить фильтры</button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
