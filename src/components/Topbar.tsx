import { Bell, Search, User } from 'lucide-react';

export function Topbar({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center justify-between border-b bg-card/80 backdrop-blur-sm px-6">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-sm font-semibold text-foreground">{title}</h1>}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center rounded-md border bg-background px-3 py-1.5">
          <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          <input placeholder="Поиск материалов, поставщиков..." className="w-56 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <button className="relative rounded-md p-2 hover:bg-accent transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>
        <div className="ml-1 flex items-center gap-2 rounded-md border px-2.5 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-3 w-3" />
          </div>
          <span className="text-xs font-medium text-foreground">Иванов А.В.</span>
        </div>
      </div>
    </header>
  );
}
