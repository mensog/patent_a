import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { deliveries } from '@/data/mock';
import { MapPin, Route, Clock, Truck, Package, Fuel, DollarSign, Navigation, ChevronRight, Zap, Weight } from 'lucide-react';

const routeLegs = [
  { from: 'Склад (СПб, Софийская ул., 60)', to: 'Москва, Складской пр-д, 15', distance: '720 км', duration: '8 ч 40 мин', order: 'ORD-2401', weight: '15 т', arrival: '08:00–12:00' },
  { from: 'Москва, Складской пр-д, 15', to: 'Подольск, ул. Промышленная, 8', distance: '48 км', duration: '1 ч 15 мин', order: 'ORD-2403', weight: '8 т', arrival: '13:00–16:00' },
  { from: 'Подольск, ул. Промышленная, 8', to: 'Химки, Ленинградское ш., 120', distance: '65 км', duration: '1 ч 30 мин', order: 'ORD-2405', weight: '22 т', arrival: '17:00–19:00' },
  { from: 'Химки, Ленинградское ш., 120', to: 'Тула, Промзона «Север», уч. 14', distance: '210 км', duration: '3 ч 10 мин', order: 'ORD-2407', weight: '10 т', arrival: '21:00–23:00' },
];

const vehicles = [
  { plate: 'К 482 АР 78', model: 'МАН TGS 26.400', capacity: '25 т', driver: 'Петров А.С.', stops: 2, load: '23 т' },
  { plate: 'М 195 ОН 47', model: 'Volvo FH 460', capacity: '22 т', driver: 'Сидоров В.И.', stops: 1, load: '22 т' },
  { plate: 'Р 673 КТ 78', model: 'Scania R450', capacity: '20 т', driver: 'Козлов Д.А.', stops: 1, load: '10 т' },
];

const totalDistance = routeLegs.reduce((s, l) => s + parseInt(l.distance), 0);
const totalDurationMin = routeLegs.reduce((s, l) => {
  const parts = l.duration.match(/(\d+)\s*ч\s*(\d+)?/);
  return s + (parts ? parseInt(parts[1]) * 60 + (parseInt(parts[2]) || 0) : 0);
}, 0);
const totalWeight = routeLegs.reduce((s, l) => s + parseInt(l.weight), 0);
const fuelCostPerKm = 18;
const deliveryCost = totalDistance * fuelCostPerKm;

export default function RoutePlanning() {
  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Планирование маршрутов</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">VRP-оптимизация · Дата: 19.03.2025 · {deliveries.length} точки доставки · {vehicles.length} транспорта</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 text-xs h-8">Сбросить</Button>
            <Button className="gap-2 text-xs h-8"><Zap className="h-3.5 w-3.5" /> Оптимизировать маршрут</Button>
          </div>
        </div>

        {/* Route KPIs — the core metrics */}
        <div className="grid grid-cols-6 gap-4">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Точек доставки</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{deliveries.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Общий пробег</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{totalDistance.toLocaleString('ru-RU')} км</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Время в пути</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{Math.floor(totalDurationMin / 60)} ч {totalDurationMin % 60} мин</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Общая масса</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{totalWeight} т</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Стоимость доставки</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{deliveryCost.toLocaleString('ru-RU')} ₽</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{fuelCostPerKm} ₽/км</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">₽ / тонна</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{Math.round(deliveryCost / totalWeight).toLocaleString('ru-RU')} ₽</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">средняя</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Map placeholder */}
          <div className="col-span-3 card-panel overflow-hidden">
            <div className="flex h-[460px] items-center justify-center bg-muted/20 relative">
              {/* Simulated route visual */}
              <div className="absolute inset-4 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary/8">
                    <Navigation className="h-7 w-7 text-primary" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-foreground">Карта маршрутов</p>
                  <p className="mt-1.5 text-xs text-muted-foreground max-w-[220px]">Интеграция с Яндекс.Картами, 2ГИС или OpenStreetMap</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                      <span className="h-2 w-2 rounded-full bg-primary" /> Маршрут 1 — 768 км
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-[10px] font-medium text-success">
                      <span className="h-2 w-2 rounded-full bg-success" /> Маршрут 2 — 275 км
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery points */}
          <div className="col-span-2 space-y-6">
            {/* Vehicles */}
            <div className="card-panel">
              <div className="px-5 pt-5 pb-0">
                <h3 className="section-title">Транспорт</h3>
              </div>
              <div className="p-5 space-y-2.5">
                {vehicles.map((v, i) => (
                  <div key={i} className="rounded-md border p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{v.plate}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{v.stops} ост.</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{v.model} · {v.driver}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(parseInt(v.load) / parseInt(v.capacity)) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{v.load}/{v.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Points */}
            <div className="card-panel">
              <div className="px-5 pt-5 pb-0">
                <h3 className="section-title">Точки доставки</h3>
              </div>
              <div className="p-5 space-y-2.5">
                {deliveries.map((d, i) => (
                  <div key={d.id} className="rounded-md border p-3.5 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                        <span className="text-xs font-mono text-primary font-medium">{d.order}</span>
                      </div>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-sm font-medium text-foreground leading-snug">{d.client}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{d.destination}</p>
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Weight className="h-3 w-3" /> {d.weight}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {d.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Route legs table */}
        <div className="card-panel">
          <div className="px-5 pt-5 pb-0">
            <h3 className="section-title">Детализация маршрута</h3>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="table-header px-4 py-2.5 text-left w-10">Лег</th>
                  <th className="table-header px-4 py-2.5 text-left">Откуда</th>
                  <th className="table-header px-4 py-2.5 text-center w-8"></th>
                  <th className="table-header px-4 py-2.5 text-left">Куда</th>
                  <th className="table-header px-4 py-2.5 text-left">Заказ</th>
                  <th className="table-header px-4 py-2.5 text-right">Масса</th>
                  <th className="table-header px-4 py-2.5 text-right">Расстояние</th>
                  <th className="table-header px-4 py-2.5 text-right">Время</th>
                  <th className="table-header px-4 py-2.5 text-right">Окно приёмки</th>
                </tr>
              </thead>
              <tbody>
                {routeLegs.map((leg, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{leg.from}</td>
                    <td className="px-4 py-3 text-center"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground mx-auto" /></td>
                    <td className="px-4 py-3 text-xs font-medium max-w-[180px] truncate">{leg.to}</td>
                    <td className="px-4 py-3 text-xs font-mono text-primary font-medium">{leg.order}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{leg.weight}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{leg.distance}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{leg.duration}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{leg.arrival}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td colSpan={5} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Итого</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{totalWeight} т</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{totalDistance.toLocaleString('ru-RU')} км</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{Math.floor(totalDurationMin / 60)} ч {totalDurationMin % 60} мин</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
