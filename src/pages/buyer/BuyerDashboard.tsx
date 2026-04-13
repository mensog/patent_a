import { DashboardLayout } from '@/components/DashboardLayout';
import { KPICard } from '@/components/KPICard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { StatusBadge } from '@/components/StatusBadge';
import { buyerKPIs, buyerRfqs, buyerActivity, orders } from '@/data/mock';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { ArrowRight, TrendingUp, AlertTriangle, Clock, Package } from 'lucide-react';

const spendByCategory = [
  { month: 'Окт', metal: 2800, cement: 400, cable: 200 },
  { month: 'Ноя', metal: 2200, cement: 600, cable: 300 },
  { month: 'Дек', metal: 3400, cement: 500, cable: 400 },
  { month: 'Янв', metal: 2900, cement: 700, cable: 350 },
  { month: 'Фев', metal: 3800, cement: 800, cable: 450 },
  { month: 'Мар', metal: 4200, cement: 650, cable: 500 },
];

const priceIndex = [
  { month: 'Окт', armat: 46.2, tube: 59.8, sheet: 52.1 },
  { month: 'Ноя', armat: 45.8, tube: 60.3, sheet: 53.4 },
  { month: 'Дек', armat: 47.1, tube: 61.2, sheet: 54.0 },
  { month: 'Янв', armat: 47.9, tube: 62.0, sheet: 54.8 },
  { month: 'Фев', armat: 48.3, tube: 62.5, sheet: 55.2 },
  { month: 'Мар', armat: 49.1, tube: 62.8, sheet: 55.5 },
];

const supplierShare = [
  { name: 'Балт. сталь', value: 38, color: 'hsl(220, 65%, 40%)' },
  { name: 'Северсталь', value: 28, color: 'hsl(220, 55%, 55%)' },
  { name: 'НЛМК', value: 20, color: 'hsl(220, 40%, 70%)' },
  { name: 'Прочие', value: 14, color: 'hsl(220, 20%, 82%)' },
];

const pendingActions = [
  { icon: AlertTriangle, text: '2 КП истекают сегодня', detail: 'Запросы #1001, #1005', urgent: true },
  { icon: Clock, text: 'Счёт №СФ-127 на 736 500 ₽', detail: 'Оплата до 22.03.2025', urgent: false },
  { icon: Package, text: 'Приёмка заказа #2401', detail: 'Ожидаемая дата: 19.03', urgent: false },
];

export default function BuyerDashboard() {
  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Обзор закупок</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">ООО «СтройКомплект» · ИНН 7701234567 · Март 2025</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {buyerKPIs.map((k, i) => <KPICard key={i} kpi={k} />)}
        </div>

        {/* Pending actions strip */}
        <div className="card-panel p-4">
          <div className="flex items-center gap-6">
            <span className="section-title shrink-0">Требуют внимания</span>
            <div className="flex items-center gap-4 overflow-x-auto">
              {pendingActions.map((a, i) => (
                <div key={i} className={`flex items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-sm ${a.urgent ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/40'}`}>
                  <a.icon className={`h-3.5 w-3.5 shrink-0 ${a.urgent ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <div>
                    <span className="font-medium text-foreground">{a.text}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{a.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Active RFQs */}
          <div className="col-span-2 card-panel">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <h3 className="section-title">Активные запросы</h3>
              <Link to="/buyer/rfq" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Все запросы <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-5 pb-5 pt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="table-header pb-3 text-left">№</th>
                    <th className="table-header pb-3 text-left">Запрос</th>
                    <th className="table-header pb-3 text-left">Объём</th>
                    <th className="table-header pb-3 text-left">Статус</th>
                    <th className="table-header pb-3 text-right">КП</th>
                    <th className="table-header pb-3 text-right">Дедлайн</th>
                  </tr>
                </thead>
                <tbody>
                  {buyerRfqs.slice(0, 5).map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-3 text-xs text-muted-foreground font-mono">#{r.id}</td>
                      <td className="py-3">
                        <Link to={`/buyer/rfq/${r.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{r.title}</Link>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">{r.totalVolume}</td>
                      <td className="py-3"><StatusBadge status={r.status} /></td>
                      <td className="py-3 text-right text-sm tabular-nums font-medium">{r.quotesCount}</td>
                      <td className="py-3 text-right text-xs text-muted-foreground">{r.deadline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ActivityFeed items={buyerActivity} />
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Orders in progress */}
          <div className="card-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Заказы в работе</h3>
              <span className="text-[11px] text-muted-foreground">{orders.length} активн.</span>
            </div>
            <div className="space-y-2">
              {orders.map(o => (
                <Link key={o.id} to={`/buyer/orders/${o.id}`} className="flex items-center justify-between rounded-md border p-3.5 hover:bg-muted/40 transition-colors group">
                  <div>
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Заказ #{o.id}</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">{o.supplier} · {o.deliveryDate}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums">{o.total}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Spend by category chart */}
          <div className="card-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Расходы по категориям, тыс. ₽</h3>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={spendByCategory} barCategoryGap="16%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 14%, 89%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid hsl(220, 14%, 89%)' }} />
                <Bar dataKey="metal" name="Металл" stackId="a" fill="hsl(220, 65%, 40%)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="cement" name="Цемент" stackId="a" fill="hsl(220, 50%, 60%)" />
                <Bar dataKey="cable" name="Кабель" stackId="a" fill="hsl(220, 35%, 78%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Supplier share */}
          <div className="card-panel p-5">
            <h3 className="section-title mb-4">Доля поставщиков</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={supplierShare} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={58} strokeWidth={2} stroke="hsl(0, 0%, 100%)">
                    {supplierShare.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 flex-1">
                {supplierShare.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                      <span className="text-foreground">{s.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Price trend */}
        <div className="card-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Динамика цен, тыс. ₽/т</h3>
            <div className="flex items-center gap-1 text-xs text-success font-medium">
              <TrendingUp className="h-3 w-3" /> Средний рост +2,4% за квартал
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={priceIndex}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 14%, 89%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={36} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid hsl(220, 14%, 89%)' }} />
              <Area type="monotone" dataKey="armat" name="Арматура" stroke="hsl(220, 65%, 40%)" fill="hsl(220, 65%, 40%)" fillOpacity={0.08} strokeWidth={2} />
              <Area type="monotone" dataKey="tube" name="Профтруба" stroke="hsl(152, 56%, 34%)" fill="hsl(152, 56%, 34%)" fillOpacity={0.08} strokeWidth={2} />
              <Area type="monotone" dataKey="sheet" name="Лист г/к" stroke="hsl(32, 95%, 44%)" fill="hsl(32, 95%, 44%)" fillOpacity={0.08} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}
