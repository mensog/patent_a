import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { orders } from '@/data/mock';
import { FileText, Download, ArrowLeft, Truck, MapPin, User, Phone, CalendarDays, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const timelineSteps = [
  { label: 'Подтверждён', date: '12.03 · 09:14', done: true },
  { label: 'Комплектация', date: '14.03 · 11:30', done: true },
  { label: 'Отгрузка', date: '17.03 · 08:00', done: false, active: true },
  { label: 'В пути', done: false },
  { label: 'Приёмка', done: false },
];

const docs = [
  { name: 'Счёт-фактура №СФ-127', date: '12.03.2025', type: 'Счёт-фактура', size: '245 КБ', status: 'ready' },
  { name: 'Спецификация к заказу #2401', date: '12.03.2025', type: 'Спецификация', size: '128 КБ', status: 'ready' },
  { name: 'Договор поставки №ДП-045/2025', date: '10.03.2025', type: 'Договор', size: '1,2 МБ', status: 'ready' },
  { name: 'УПД №89', date: '17.03.2025', type: 'УПД', size: '310 КБ', status: 'pending' },
  { name: 'Сертификат качества — арматура', date: '—', type: 'Сертификат', size: '—', status: 'pending' },
];

const invoices = [
  { number: 'СФ-127', date: '12.03.2025', amount: '736 500 ₽', dueDate: '22.03.2025', status: 'invoiced' },
  { number: 'СФ-128', date: '14.03.2025', amount: '736 500 ₽', dueDate: '24.03.2025', status: 'pending' },
];

const shipmentEvents = [
  { time: '17.03 · 08:12', text: 'Машина загружена, выезд со склада г. Санкт-Петербург', icon: Truck },
  { time: '17.03 · 07:45', text: 'Комплектация завершена, начало погрузки', icon: CheckCircle2 },
  { time: '14.03 · 11:30', text: 'Комплектация на складе — проверка номенклатуры', icon: CheckCircle2 },
  { time: '12.03 · 09:14', text: 'Заказ подтверждён поставщиком', icon: CheckCircle2 },
];

export default function OrderDetail() {
  const order = orders[0];

  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div>
          <Link to="/buyer" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Обзор
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Заказ #{order.id}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{order.supplier} · создан {order.created} · поставка {order.deliveryDate}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.paymentStatus} />
            </div>
          </div>
        </div>

        {/* Timeline — full width */}
        <div className="card-panel p-6">
          <h3 className="section-title mb-6">Прогресс заказа</h3>
          <Timeline steps={timelineSteps} />
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left 2 cols — order items + shipment log */}
          <div className="col-span-2 space-y-6">
            {/* Order items */}
            <div className="card-panel">
              <div className="px-5 pt-5 pb-0 flex items-center justify-between">
                <h3 className="section-title">Позиции заказа</h3>
                <span className="text-xs text-muted-foreground">{order.items.length} позиции</span>
              </div>
              <div className="p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="table-header px-4 py-2.5 text-left">Материал</th>
                      <th className="table-header px-4 py-2.5 text-right">Кол-во</th>
                      <th className="table-header px-4 py-2.5 text-right">Цена</th>
                      <th className="table-header px-4 py-2.5 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{it.name}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{it.qty}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{it.price}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">{it.sum || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Итого с НДС (20%)</span>
                  </div>
                  <span className="text-xl font-bold tabular-nums">{order.total}</span>
                </div>
              </div>
            </div>

            {/* Shipment & receiving timeline */}
            <div className="card-panel">
              <div className="px-5 pt-5 pb-0 flex items-center justify-between">
                <h3 className="section-title">Журнал отгрузки и доставки</h3>
                <StatusBadge status="in_progress" />
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="rounded-md border p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Транспорт</span>
                    </div>
                    <p className="text-sm font-medium">МАН TGS 26.400 · К 482 АР 78</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Водитель: Петров А. С. · +7 (921) 456-78-90</p>
                  </div>
                  <div className="rounded-md border p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Адрес доставки</span>
                    </div>
                    <p className="text-sm font-medium">Москва, Складской пр-д, д. 15, стр. 2</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Ожидание: 19.03 · 08:00–12:00</p>
                  </div>
                </div>

                <div className="space-y-0">
                  {shipmentEvents.map((ev, i) => (
                    <div key={i} className="flex items-start gap-3 relative">
                      {i < shipmentEvents.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                      )}
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 z-10 ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <ev.icon className="h-3 w-3" />
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

          {/* Right column — documents + invoices */}
          <div className="space-y-6">
            {/* Invoices */}
            <div className="card-panel">
              <div className="px-5 pt-5 pb-0">
                <h3 className="section-title">Счета на оплату</h3>
              </div>
              <div className="p-5 space-y-2.5">
                {invoices.map((inv, i) => (
                  <div key={i} className="rounded-md border p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">№{inv.number}</span>
                      </div>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>от {inv.date}</span>
                      <span className="font-semibold text-foreground tabular-nums">{inv.amount}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-xs">
                      <CalendarDays className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Оплата до {inv.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="card-panel">
              <div className="px-5 pt-5 pb-0 flex items-center justify-between">
                <h3 className="section-title">Документы</h3>
                <span className="text-[11px] text-muted-foreground">{docs.length} файлов</span>
              </div>
              <div className="p-5 space-y-2">
                {docs.map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-md ${d.status === 'ready' ? 'bg-muted' : 'bg-warning/10'}`}>
                        {d.status === 'ready'
                          ? <FileText className="h-4 w-4 text-muted-foreground" />
                          : <AlertCircle className="h-4 w-4 text-warning" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{d.name}</p>
                        <p className="text-[11px] text-muted-foreground">{d.type} · {d.date} · {d.size}</p>
                      </div>
                    </div>
                    {d.status === 'ready' ? (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Download className="h-3.5 w-3.5" /></Button>
                    ) : (
                      <span className="text-[10px] font-medium text-warning uppercase">Ожидается</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contact info */}
            <div className="card-panel p-5">
              <h3 className="section-title mb-3">Контактное лицо поставщика</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Иванова Мария Сергеевна</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-primary">+7 (812) 345-67-89</span>
                </div>
                <p className="text-xs text-muted-foreground">Менеджер отдела продаж</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
