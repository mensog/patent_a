import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  label: string;
  date?: string;
  done: boolean;
  active?: boolean;
}

export function Timeline({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-start">
      {steps.map((s, i) => (
        <div key={i} className="flex items-start flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              s.done ? 'bg-success text-success-foreground' :
              s.active ? 'bg-primary text-primary-foreground ring-4 ring-primary/15' :
              'border-2 border-border bg-background text-muted-foreground'
            )}>
              {s.done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('mt-2 text-xs whitespace-nowrap', s.done || s.active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {s.label}
            </span>
            {s.date && <span className="mt-0.5 text-[10px] text-muted-foreground">{s.date}</span>}
          </div>
          {i < steps.length - 1 && (
            <div className={cn('mt-4 h-[2px] flex-1 mx-2 rounded-full', s.done ? 'bg-success' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  );
}
