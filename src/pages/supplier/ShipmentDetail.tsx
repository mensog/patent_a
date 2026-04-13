import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { Button } from '@/components/ui/button';
import { Truck, Package, FileText, ArrowLeft, MapPin, User, Phone, Weight, Clock, Printer, CheckCircle2, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

const shipmentSteps = [
  { label: 'Подтверждён', date: '12.03 · 09:14', done: true },
  { label: 'Комплектация', date: '14.03 · 11:30', done: true },
  { label: 'Отгрузка', date: '17.03 · 08:00', done: false, active: true },
  { label: 'В пути', done: false },
  { label: 'Доставлено', done: false },
];

const shipmentItems = [
  { name: 'Арматура А500С ∅12 мм', qty: '15 т', weight: '15 000 кг', packs: '30 пучков', checked: true },
  { name: 'Арматура А500С ∅16 мм', qty: '10 т', weight: '10 000 кг', packs: '20 пучков', checked: true },
  { name: 'Проволока Вр-1 ∅5 мм', qty: '5 т', weight: '5 000 кг', packs: '25 бухт', checked: false },
];

const docs = [
  { name: 'ТТН №89/2401', status: 'ready' as const },
  { name: 'УПД №89', status: 'ready' as const },
  { name: 'Сертификат качества — арматура', status: 'ready' as const },
  { name: 'CMR (междугородняя)', status: 'pending' as const },
];

const events = [
  { time: '17.03 · 08:12', text: 'Начало погрузки — кран №2, площадка 4Б' },
  { time: '17.03 · 07:45', text: 'Водитель прибыл на склад, КПП пройден' },
  { time: '14.03 · 16:00', text: 'Комплектация завершена — 3/3 позиции на площадке' },
  { time: '14.03 · 11:30', text: 'Начало комплектации, ответственный: Семёнов К.П.' },
  { time: '12.03 · 09:14', text: 'Заказ подтверждён, назначен на комплектацию' },
];

export default function ShipmentDetail() {
  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div>
          <Link to="/supplier" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Обзор
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Отгрузка #SH-2401</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">К заказу #2401 · ООО «СтройКомплект» · Москва, Складской пр-д, 15</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="in_progress" />
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
                <Printer className="h-3 w-3" /> Печать ТТН
              </Button>
              <Button size="sm" className="text-xs h-8 gap-1">
                <Truck className="h-3 w-3" /> Подтвердить отгрузку
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="card-panel p-6">
          <h3 className="section-title mb-6">Статус отгрузки</h3>
          <Timeline steps={shipmentSteps} />
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="kpi-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Транспорт</p>
                <p className="mt-0.5 text-sm font-semibold">МАН TGS 26.400</p>
                <p className="text-xs text-muted-foreground">К 482 АР 78</p>
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Водитель</p>
                <p className="mt-0.5 text-sm font-semibold">Петров А. С.</p>
                <p className="text-xs text-primary">+7 (921) 456-78-90</p>
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
                <Weight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Масса груза</p>
                <p className="mt-0.5 text-sm font-semibold">30 000 кг</p>
                <p className="text-xs text-muted-foreground">75 ед. упаковки</p>
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Доставка</p>
                <p className="mt-0.5 text-sm font-semibold">19.03 · 08:00–12:00</p>
                <p className="text-xs text-muted-foreground">~720 км</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Shipment contents with checklist */}
          <div className="col-span-2 card-panel">
            <div className="px-5 pt-5 pb-0 flex items-center justify-between">
              <h3 className="section-title">Содержимое отгрузки</h3>
              <span className="text-xs text-muted-foreground">{shipmentItems.filter(i => i.checked).length}/{shipmentItems.length} проверено</span>
            </div>
            <div className="p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="table-header px-4 py-2.5 text-center w-10"></th>
                    <th className="table-header px-4 py-2.5 text-left">Материал</th>
                    <th className="table-header px-4 py-2.5 text-right">Кол-во</th>
                    <th className="table-header px-4 py-2.5 text-right">Масса</th>
                    <th className="table-header px-4 py-2.5 text-right">Упаковка</th>
                  </tr>
                </thead>
                <tbody>
                  {shipmentItems.map((it, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-4 py-3 text-center">
                        {it.checked
                          ? <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
                          : <div className="mx-auto h-4 w-4 rounded-full border-2 border-border" />
                        }
                      </td>
                      <td className="px-4 py-3 font-medium">{it.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{it.qty}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{it.weight}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{it.packs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Documents + log */}
          <div className="space-y-6">
            <div className="card-panel">
              <div className="px-5 pt-5 pb-0">
                <h3 className="section-title">Документы отгрузки</h3>
              </div>
              <div className="p-5 space-y-2">
                {docs.map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <FileText className={`h-4 w-4 ${d.status === 'ready' ? 'text-muted-foreground' : 'text-warning'}`} />
                      <span className="text-sm font-medium">{d.name}</span>
                    </div>
                    {d.status === 'ready'
                      ? <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Download className="h-3.5 w-3.5" /></Button>
                      : <span className="text-[10px] font-medium text-warning uppercase">Ожидается</span>
                    }
                  </div>
                ))}
              </div>
            </div>

            <div className="card-panel">
              <div className="px-5 pt-5 pb-0">
                <h3 className="section-title">Журнал операций</h3>
              </div>
              <div className="p-5 space-y-0">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    {i < events.length - 1 && <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />}
                    <div className={`mt-1 h-4 w-4 rounded-full shrink-0 z-10 flex items-center justify-center ${i === 0 ? 'bg-primary' : 'bg-muted'}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-primary-foreground' : 'bg-muted-foreground'}`} />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-foreground">{ev.text}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{ev.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
