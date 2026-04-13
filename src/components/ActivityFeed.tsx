import { cn } from '@/lib/utils';
import type { Activity } from '@/data/mock';

const dotColors: Record<string, string> = {
  info: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
};

export function ActivityFeed({ items, title = 'Последние события' }: { items: Activity[]; title?: string }) {
  return (
    <div className="card-panel p-5">
      <h3 className="section-title mb-4">{title}</h3>
      <div className="space-y-4">
        {items.map(a => (
          <div key={a.id} className="flex items-start gap-3">
            <div className={cn(
              'mt-1.5 h-2 w-2 rounded-full shrink-0',
              dotColors[a.type || 'info'] || 'bg-primary'
            )} />
            <div className="min-w-0">
              <p className="text-sm leading-snug text-foreground">{a.text}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
