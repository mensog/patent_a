import { cn } from '@/lib/utils';

interface AppLogoProps {
  compact?: boolean;
  className?: string;
}

export function AppLogo({ compact = false, className }: AppLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
          <path d="M5 8.5 12 4l7 4.5v7L12 20l-7-4.5v-7Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="m5.5 8.8 6.5 3.9 6.5-3.9M12 12.7V20" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-sm font-extrabold tracking-tight text-current">EcaMarket</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Procurement</span>
        </span>
      )}
    </span>
  );
}
