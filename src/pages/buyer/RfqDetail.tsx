import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { quotes, buyerRfqs } from '@/data/mock';
import { Button } from '@/components/ui/button';
import { Star, ShoppingCart, ArrowLeft, Check, X, Clock, FileText, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

const rfqPositions = [
  { name: 'Арматура А500С ∅12 мм', qty: '15 т', gost: 'ГОСТ 34028-2016' },
  { name: 'Арматура А500С ∅16 мм', qty: '10 т', gost: 'ГОСТ 34028-2016' },
  { name: 'Проволока Вр-1 ∅5 мм', qty: '5 т', gost: 'ГОСТ 6727-80' },
];

export default function RfqDetail() {
  const rfq = buyerRfqs[0];
  const bestPrice = Math.min(...quotes.map(q => q.price));
  const avgPrice = Math.round(quotes.reduce((s, q) => s + q.price, 0) / quotes.length);
  const savings = ((avgPrice - bestPrice) / avgPrice * 100).toFixed(1);

  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div>
          <Link to="/buyer/rfq" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Все запросы
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">{rfq.title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Запрос #{rfq.id} · Создан {rfq.created} · Дедлайн {rfq.deadline}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={rfq.status} />
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
                <Download className="h-3 w-3" /> Экспорт в Excel
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Позиции</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums">{rfq.positions}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Объём</p>
            <p className="mt-1.5 text-xl font-bold">{rfq.totalVolume}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Получено КП</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-primary">{rfq.quotesCount}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Лучшая цена</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-success">{bestPrice.toLocaleString('ru-RU')} ₽</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Экономия</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-success">{savings}%</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">от средней цены</p>
          </div>
        </div>

        {/* Positions */}
        <div className="card-panel">
          <div className="px-5 pt-5 pb-0">
            <h3 className="section-title">Позиции запроса</h3>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="table-header px-4 py-2.5 text-left">№</th>
                  <th className="table-header px-4 py-2.5 text-left">Наименование</th>
                  <th className="table-header px-4 py-2.5 text-left">ГОСТ</th>
                  <th className="table-header px-4 py-2.5 text-right">Объём</th>
                </tr>
              </thead>
              <tbody>
                {rfqPositions.map((p, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{p.gost}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quote comparison — main visual */}
        <div className="card-panel">
          <div className="px-5 pt-5 pb-0 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Сравнение коммерческих предложений</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{quotes.length} предложений от {new Set(quotes.map(q => q.supplier.id)).size} поставщиков</p>
            </div>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="table-header px-4 py-2.5 text-left">Поставщик</th>
                  <th className="table-header px-4 py-2.5 text-right">Цена, ₽/т</th>
                  <th className="table-header px-4 py-2.5 text-center">НДС</th>
                  <th className="table-header px-4 py-2.5 text-right">Мин. объём</th>
                  <th className="table-header px-4 py-2.5 text-right">Остаток</th>
                  <th className="table-header px-4 py-2.5 text-right">Срок</th>
                  <th className="table-header px-4 py-2.5 text-right">Действует до</th>
                  <th className="table-header px-4 py-2.5 text-center">Статус</th>
                  <th className="table-header px-4 py-2.5 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {[...quotes].sort((a, b) => a.price - b.price).map(q => {
                  const isBest = q.price === bestPrice;
                  return (
                    <tr key={q.id} className={`border-b last:border-0 transition-colors ${isBest ? 'bg-success/[0.03]' : 'hover:bg-muted/40'}`}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {isBest && <div className="h-5 w-1 rounded-full bg-success shrink-0" />}
                          <div>
                            <div className="font-semibold text-sm">{q.supplier.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                              {q.supplier.city}
                              <Star className="h-3 w-3 text-warning fill-warning" />
                              <span className="font-medium">{q.supplier.rating}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`text-base font-bold tabular-nums ${isBest ? 'text-success' : ''}`}>{q.price.toLocaleString('ru-RU')}</span>
                        {isBest && <span className="block text-[10px] text-success font-semibold">Лучшая</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {q.nds
                          ? <span className="inline-flex items-center gap-0.5 text-xs text-success"><Check className="h-3 w-3" /> Вкл.</span>
                          : <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><X className="h-3 w-3" /> Без</span>
                        }
                      </td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">{q.minVolume}</td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">{q.stock}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{q.deliveryDays} дн.</td>
                      <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">{q.validUntil}</td>
                      <td className="px-4 py-3.5 text-center"><StatusBadge status={q.status} /></td>
                      <td className="px-4 py-3.5 text-right">
                        {q.status === 'sent' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Link to="/buyer/orders/1">
                              <Button size="sm" className="gap-1 text-xs h-7">
                                <Check className="h-3 w-3" /> Принять
                              </Button>
                            </Link>
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
