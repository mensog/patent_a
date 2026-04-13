import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { buyerRfqs } from '@/data/mock';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function RfqList() {
  return (
    <DashboardLayout mode="buyer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Запросы на КП (RFQ)</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{buyerRfqs.length} запросов</p>
          </div>
          <Button className="gap-2 text-xs"><Plus className="h-3.5 w-3.5" /> Новый запрос</Button>
        </div>

        <div className="card-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="table-header p-4 text-left">№</th>
                <th className="table-header p-4 text-left">Запрос</th>
                <th className="table-header p-4 text-center">Позиции</th>
                <th className="table-header p-4 text-center">Объём</th>
                <th className="table-header p-4 text-center">КП</th>
                <th className="table-header p-4 text-center">Статус</th>
                <th className="table-header p-4 text-left">Создан</th>
                <th className="table-header p-4 text-left">Дедлайн</th>
              </tr>
            </thead>
            <tbody>
              {buyerRfqs.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="p-4 text-xs text-muted-foreground font-mono">#{r.id}</td>
                  <td className="p-4">
                    <Link to={`/buyer/rfq/${r.id}`} className="font-medium text-foreground hover:text-primary transition-colors">{r.title}</Link>
                  </td>
                  <td className="p-4 text-center tabular-nums">{r.positions}</td>
                  <td className="p-4 text-center text-muted-foreground text-xs">{r.totalVolume || '—'}</td>
                  <td className="p-4 text-center tabular-nums">{r.quotesCount}</td>
                  <td className="p-4 text-center"><StatusBadge status={r.status} /></td>
                  <td className="p-4 text-xs text-muted-foreground">{r.created}</td>
                  <td className="p-4 text-xs text-muted-foreground">{r.deadline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
