import { cn } from '@/lib/utils';
import type { KPI } from '@/data/mock';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function KPICard({ kpi }: { kpi: KPI }) {
  return (
    <div className="kpi-card">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
      {kpi.change && (
        <div className={cn(
          'mt-2 flex items-center gap-1 text-xs font-medium',
          kpi.changeType === 'positive' && 'text-success',
          kpi.changeType === 'negative' && 'text-destructive',
          kpi.changeType === 'neutral' && 'text-muted-foreground',
        )}>
          {kpi.changeType === 'positive' && <TrendingUp className="h-3 w-3" />}
          {kpi.changeType === 'negative' && <TrendingDown className="h-3 w-3" />}
          {kpi.changeType === 'neutral' && <Minus className="h-3 w-3" />}
          {kpi.change}
        </div>
      )}
    </div>
  );
}
