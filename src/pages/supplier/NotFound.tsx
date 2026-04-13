import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { buyerRfqs } from '@/data/mock';
import { Send, ArrowLeft, Clock, Building2, FileText, Calculator, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const rfq = buyerRfqs[0];
const positions = [
  { name: 'Арматура А500С ∅12 мм', qty: '15 т', unit: 'тонна', gost: 'ГОСТ 34028-2016', yourPrice: '49100', yourStock: '200', yourDays: '3' },
  { name: 'Арматура А500С ∅16 мм', qty: '10 т', unit: 'тонна', gost: 'ГОСТ 34028-2016', yourPrice: '49800', yourStock: '150', yourDays: '3' },
  { name: 'Проволока Вр-1 ∅5 мм', qty: '5 т', unit: 'тонна', gost: 'ГОСТ 6727-80', yourPrice: '47700', yourStock: '80', yourDays: '5' },
];

const competitorPrices = [
  { min: '46 800', max: '49 500', avg: '48 200' },
  { min: '48 200', max: '51 000', avg: '49 600' },
  { min: '45 500', max: '48 900', avg: '47 100' },
];

export default function SupplierRfqResponse() {
  const [nds, setNds] = useState(true);
  const [validUntil, setValidUntil] = useState('25.03.2025');

  const totalEstimate = positions.reduce((s, p) => {
    const qty = parseInt(p.qty);
    const price = parseInt(p.yourPrice);
    return s + qty * price;
  }, 0);

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div>
          <Link to="/supplier" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Обзор
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">{rfq.title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Формирование КП к запросу #{rfq.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={rfq.status} />
              <div className="flex items-center gap-1 text-xs text-warning font-medium">
                <Clock className="h-3 w-3" /> Осталось 4 дня
              </div>
            </div>
          </div>
        </div>

        {/* Buyer info + RFQ summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="kpi-card col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Покупатель</p>
                <p className="mt-0.5 text-sm font-semibold">ООО «СтройКомплект»</p>
                <p className="text-xs text-muted-foreground">ИНН 7701234567 · Москва · 14 заказов за год</p>
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Позиции</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums">{rfq.positions}</p>
            <p className="text-xs text-muted-foreground">Объём: {rfq.totalVolume}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Дедлайн</p>
            <p className="mt-1.5 text-xl font-bold">{rfq.deadline}</p>
            <p className="text-xs text-muted-foreground">Создан {rfq.created}</p>
          </div>
        </div>

        {/* Quote form */}
        <div className="card-panel">
          <div className="px-5 pt-5 pb-0 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Формирование коммерческого предложения</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Укажите цены, остатки и сроки по каждой позиции</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">НДС:</label>
                <button onClick={() => setNds(!nds)} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${nds ? 'bg-success/10 text-success border-success/30' : 'text-muted-foreground'}`}>
                  {nds ? 'Включён (20%)' : 'Без НДС'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Действует до:</label>
                <input className="rounded-md border bg-background px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="table-header px-4 py-2.5 text-left">Материал</th>
                  <th className="table-header px-4 py-2.5 text-left">ГОСТ</th>
                  <th className="table-header px-4 py-2.5 text-right">Запрошено</th>
                  <th className="table-header px-4 py-2.5 text-right">Рыночный диапазон</th>
                  <th className="table-header px-4 py-2.5 text-right">Ваша цена, ₽/т</th>
                  <th className="table-header px-4 py-2.5 text-right">Остаток</th>
                  <th className="table-header px-4 py-2.5 text-right">Срок, дн.</th>
                  <th className="table-header px-4 py-2.5 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => {
                  const sum = parseInt(p.qty) * parseInt(p.yourPrice);
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-4 py-3.5">
                        <span className="font-medium">{p.name}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">{p.gost}</td>
                      <td className="px-4 py-3.5 text-right font-medium">{p.qty}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-[11px] text-muted-foreground">{competitorPrices[i].min}–{competitorPrices[i].max}</span>
                        <span className="block text-[10px] text-muted-foreground">Ср.: {competitorPrices[i].avg}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <input className="w-28 rounded-md border bg-background px-2.5 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-ring tabular-nums font-medium" defaultValue={p.yourPrice} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <input className="w-20 rounded-md border bg-background px-2.5 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-ring tabular-nums" defaultValue={`${p.yourStock} т`} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <input className="w-16 rounded-md border bg-background px-2.5 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-ring tabular-nums" defaultValue={p.yourDays} />
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{sum.toLocaleString('ru-RU')} ₽</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calculator className="h-3.5 w-3.5" />
                Итого (оценка): <span className="font-bold text-foreground text-sm">{totalEstimate.toLocaleString('ru-RU')} ₽</span>
                {nds && <span className="text-[10px]">вкл. НДС 20%</span>}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="text-xs h-8">Сохранить черновик</Button>
                <Button className="gap-2 text-xs h-8"><Send className="h-3.5 w-3.5" /> Отправить КП</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card-panel p-5">
          <h3 className="section-title mb-3">Комментарий к предложению</h3>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
            rows={3}
            placeholder="Условия поставки, особые требования, комментарии для покупателя..."
            defaultValue="Доставка собственным транспортом. При заказе от 20 т — скидка 2%. Сертификаты качества прилагаются."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
