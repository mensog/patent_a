import { DashboardLayout } from '@/components/DashboardLayout';
import { KPICard } from '@/components/KPICard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { StatusBadge } from '@/components/StatusBadge';
import { supplierKPIs, supplierActivity, supplierOffers, deliveries } from '@/data/mock';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowRight, Truck, Package, AlertTriangle, Clock, FileText, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const pieData = [
  { name: 'Принятые', value: 12 },
  { name: 'На рассмотрении', value: 8 },
  { name: 'Отклонённые', value: 3 },
];
const COLORS = ['hsl(152, 56%, 34%)', 'hsl(220, 65%, 40%)', 'hsl(4, 72%, 46%)'];

const revenueData = [
  { month: 'Окт', value: 4800 },
  { month: 'Ноя', value: 5200 },
  { month: 'Дек', value: 6100 },
  { month: 'Янв', value: 5500 },
  { month: 'Фев', value: 7200 },
  { month: 'Мар', value: 8400 },
];

const urgentTasks = [
  { icon: AlertTriangle, text: '3 КП истекают сегодня', detail: 'Требуется продление или подтверждение', urgent: true },
  { icon: Truck, text: 'Отгрузка #SH-2401 готова', detail: 'Ожидание подтверждения водителя', urgent: false },
  { icon: Package, text: 'Заказ #2403 — начать комплектацию', detail: 'Дедлайн отгрузки: 20.03', urgent: true },
  { icon: FileText, text: 'Новый RFQ #1002 — профтруба', detail: '12 т, дедлайн 21.03', urgent: false },
];

export default function SupplierDashboard() {
  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Центр управления</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">ООО «ТД Балтийская сталь» · ИНН 7802456123 · Март 2025</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/supplier/rfq/1">
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
                <FileText className="h-3 w-3" /> Ответить на RFQ
              </Button>
            </Link>
            <Link to="/supplier/import">
              <Button size="sm" className="text-xs h-8 gap-1">
                <Package className="h-3 w-3" /> Обновить прайс
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {supplierKPIs.map((k, i) => <KPICard key={i} kpi={k} />)}
        </div>

        {/* Urgent tasks strip */}
        <div className="card-panel p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="section-title">Требуют действия</span>
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive tabular-nums">{urgentTasks.filter(t => t.urgent).length} срочных</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {urgentTasks.map((t, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-md border px-3.5 py-3 ${t.urgent ? 'border-destructive/30 bg-destructive/[0.03]' : 'bg-muted/30'}`}>
                <t.icon className={`h-4 w-4 shrink-0 ${t.urgent ? 'text-destructive' : 'text-muted-foreground'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.text}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Shipments in progress */}
          <div className="col-span-2 card-panel">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <h3 className="section-title">Отгрузки и доставки</h3>
              <Link to="/supplier/routes" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Маршруты <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="table-header px-4 py-2.5 text-left">Заказ</th>
                    <th className="table-header px-4 py-2.5 text-left">Клиент</th>
                    <th className="table-header px-4 py-2.5 text-left">Адрес</th>
                    <th className="table-header px-4 py-2.5 text-right">Масса</th>
                    <th className="table-header px-4 py-2.5 text-left">Окно</th>
                    <th className="table-header px-4 py-2.5 text-center">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map(d => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono font-medium text-primary">{d.order}</td>
                      <td className="px-4 py-3 font-medium">{d.client}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{d.destination}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{d.weight}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{d.time}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ActivityFeed items={supplierActivity} />
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Offers summary */}
          <div className="card-panel">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <h3 className="section-title">Каталог предложений</h3>
              <Link to="/supplier/offers" className="text-xs font-medium text-primary hover:underline">Все →</Link>
            </div>
            <div className="p-5 space-y-2">
              {supplierOffers.slice(0, 4).map(o => (
                <div key={o.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{o.material}</p>
                    <p className="text-xs text-muted-foreground">{o.stock} · Обн. {o.lastUpdated}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{o.price} ₽</p>
                    <span className={`inline-flex h-1.5 w-1.5 rounded-full ${o.active ? 'bg-success' : 'bg-muted-foreground'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quote status pie */}
          <div className="card-panel p-5">
            <h3 className="section-title mb-4">КП по статусам</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={34} outerRadius={54} dataKey="value" stroke="hsl(0,0%,100%)" strokeWidth={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 flex-1">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue chart */}
          <div className="card-panel p-5">
            <h3 className="section-title mb-4">Выручка, тыс. ₽</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={revenueData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 14%, 89%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                <Bar dataKey="value" fill="hsl(220, 65%, 40%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
