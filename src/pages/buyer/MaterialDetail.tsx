import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { materials, quotes } from '@/data/mock';
import { Star, ArrowLeft, Check, ShoppingCart, Shield, Clock, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function MaterialDetail() {
  const material = materials[0];
  const bestPrice = Math.min(...quotes.map(q => q.price));
  const avgPrice = Math.round(quotes.reduce((s, q) => s + q.price, 0) / quotes.length);

  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div>
          <Link to="/buyer/catalog" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Каталог
          </Link>
          <h1 className="page-title">{material.name}</h1>
          <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{material.category}</span>
            <span className="font-mono text-xs">{material.gost}</span>
            <span>·</span>
            <span>Ед.: {material.unit}</span>
            <span>·</span>
            <span>Мин. заказ: {material.minOrder}</span>
          </div>
        </div>

        {/* Price summary strip */}
        <div className="grid grid-cols-4 gap-4">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Лучшая цена</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-success">{bestPrice.toLocaleString('ru-RU')} ₽</p>
            <p className="mt-1 text-xs text-muted-foreground">за тонну, с НДС</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Средняя цена</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{avgPrice.toLocaleString('ru-RU')} ₽</p>
            <p className="mt-1 text-xs text-muted-foreground">по {quotes.length} предложениям</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Мин. срок поставки</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{Math.min(...quotes.map(q => q.deliveryDays))} дн.</p>
            <p className="mt-1 text-xs text-muted-foreground">ТД Балтийская сталь</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Общий остаток</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{quotes.reduce((s, q) => s + parseInt(q.stock), 0)} т</p>
            <p className="mt-1 text-xs text-muted-foreground">на складах поставщиков</p>
          </div>
        </div>

        {/* Main comparison table — strongest visual element */}
        <div className="card-panel">
          <div className="px-5 pt-5 pb-0 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Сравнение поставщиков</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{quotes.length} предложений · отсортировано по цене</p>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {[...quotes].sort((a, b) => a.price - b.price).map((q, idx) => {
                const isBest = q.price === bestPrice;
                return (
                  <div key={q.id} className={`rounded-lg border p-4 transition-colors ${isBest ? 'border-success/40 bg-success/[0.03] ring-1 ring-success/20' : 'hover:bg-muted/40'}`}>
                    <div className="flex items-center gap-6">
                      {/* Rank */}
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 ${isBest ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {idx + 1}
                      </div>

                      {/* Supplier info */}
                      <div className="min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{q.supplier.name}</span>
                          {isBest && <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success uppercase">Лучшая цена</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>{q.supplier.city}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-warning fill-warning" /> {q.supplier.rating}</span>
                          {q.supplier.inn && <span className="font-mono">ИНН {q.supplier.inn}</span>}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right min-w-[120px]">
                        <span className={`text-lg font-bold tabular-nums ${isBest ? 'text-success' : 'text-foreground'}`}>
                          {q.price.toLocaleString('ru-RU')} ₽
                        </span>
                        <p className="text-[10px] text-muted-foreground">за т · {q.nds ? 'c НДС' : 'без НДС'}</p>
                      </div>

                      {/* Details grid */}
                      <div className="flex items-center gap-6 flex-1 text-sm">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Мин. объём</p>
                          <p className="font-medium tabular-nums">{q.minVolume}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Остаток</p>
                          <p className="font-medium tabular-nums">{q.stock}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Срок</p>
                          <p className="font-medium tabular-nums">{q.deliveryDays} дн.</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Действует до</p>
                          <p className="font-medium">{q.validUntil}</p>
                        </div>
                      </div>

                      {/* Status & action */}
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={q.status} />
                        {q.status === 'sent' && (
                          <Link to="/buyer/orders/1">
                            <Button size="sm" className="gap-1 text-xs h-8">
                              <ShoppingCart className="h-3 w-3" /> Заказать
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trust signals */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card-panel p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success/10">
              <Shield className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Верификация поставщиков</p>
              <p className="text-xs text-muted-foreground">ИНН, ОГРН, сертификаты проверены</p>
            </div>
          </div>
          <div className="card-panel p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Актуальные остатки</p>
              <p className="text-xs text-muted-foreground">Данные обновлены сегодня в 09:00</p>
            </div>
          </div>
          <div className="card-panel p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-warning/10">
              <TrendingDown className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Динамика цен</p>
              <p className="text-xs text-muted-foreground">−1,2% за последние 30 дней</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
