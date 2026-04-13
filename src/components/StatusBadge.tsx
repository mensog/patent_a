import { statusLabels } from '@/data/mock';
import { cn } from '@/lib/utils';

const variantMap: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  published: 'bg-primary/8 text-primary border-primary/20',
  quoted: 'bg-info/8 text-info border-info/20',
  closed: 'bg-muted text-muted-foreground border-border',
  sent: 'bg-info/8 text-info border-info/20',
  accepted: 'bg-success/8 text-success border-success/20',
  rejected: 'bg-destructive/8 text-destructive border-destructive/20',
  confirmed: 'bg-primary/8 text-primary border-primary/20',
  in_progress: 'bg-warning/8 text-warning border-warning/20',
  shipped: 'bg-info/8 text-info border-info/20',
  received: 'bg-success/8 text-success border-success/20',
  pending: 'bg-muted text-muted-foreground border-border',
  invoiced: 'bg-primary/8 text-primary border-primary/20',
  partially_paid: 'bg-warning/8 text-warning border-warning/20',
  paid: 'bg-success/8 text-success border-success/20',
  overdue: 'bg-destructive/8 text-destructive border-destructive/20',
  planned: 'bg-primary/8 text-primary border-primary/20',
  in_transit: 'bg-warning/8 text-warning border-warning/20',
  delivered: 'bg-success/8 text-success border-success/20',
};

const dotMap: Record<string, string> = {
  draft: 'bg-muted-foreground',
  published: 'bg-primary',
  quoted: 'bg-info',
  closed: 'bg-muted-foreground',
  sent: 'bg-info',
  accepted: 'bg-success',
  rejected: 'bg-destructive',
  confirmed: 'bg-primary',
  in_progress: 'bg-warning',
  shipped: 'bg-info',
  received: 'bg-success',
  pending: 'bg-muted-foreground',
  invoiced: 'bg-primary',
  partially_paid: 'bg-warning',
  paid: 'bg-success',
  overdue: 'bg-destructive',
  planned: 'bg-primary',
  in_transit: 'bg-warning',
  delivered: 'bg-success',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
      variantMap[status] || 'bg-muted text-muted-foreground border-border',
      className
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dotMap[status] || 'bg-muted-foreground')} />
      {statusLabels[status] || status}
    </span>
  );
}
