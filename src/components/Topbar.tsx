import { User, Settings, Building2, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationsPanel } from './NotificationsPanel';
import { TopbarSearch } from './TopbarSearch';

export function Topbar({ title }: { title?: string }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = profile?.full_name || 'Пользователь';

  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center justify-between border-b bg-card/90 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-sm font-semibold text-foreground">{title}</h1>}
      </div>
      <div className="flex items-center gap-1.5">
        <TopbarSearch />
        <NotificationsPanel />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-full border border-primary/10 bg-primary px-2 py-2 text-primary-foreground transition-colors hover:bg-primary/90">
              <div className="flex h-5 w-5 items-center justify-center rounded-full">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="sr-only">{displayName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings/profile')} className="text-xs gap-2">
              <Settings className="h-3.5 w-3.5" />
              Настройки профиля
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings/company')} className="text-xs gap-2">
              <Building2 className="h-3.5 w-3.5" />
              Настройки компании
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-xs gap-2 text-destructive focus:text-destructive">
              <LogOut className="h-3.5 w-3.5" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
