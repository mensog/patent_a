import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Topbar } from './Topbar';
import { AppLogo } from './AppLogo';
import {
  LayoutDashboard, Search, FileText, ShoppingCart, Truck,
  Package, Upload, Map, ChevronLeft, ChevronRight, Building2, Factory
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
}

const buyerNav: NavItem[] = [
  { label: 'Дашборд', to: '/buyer', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Каталог', to: '/buyer/catalog', icon: <Search className="h-4 w-4" /> },
  { label: 'Запросы на закупку', to: '/buyer/rfq', icon: <FileText className="h-4 w-4" /> },
  { label: 'Заказы', to: '/buyer/orders', icon: <ShoppingCart className="h-4 w-4" /> },
];

const supplierNav: NavItem[] = [
  { label: 'Дашборд', to: '/supplier', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Предложения', to: '/supplier/offers', icon: <Package className="h-4 w-4" /> },
  { label: 'Импорт прайс-листа', to: '/supplier/import', icon: <Upload className="h-4 w-4" /> },
  { label: 'Запросы покупателей', to: '/supplier/rfq', icon: <FileText className="h-4 w-4" /> },
  { label: 'Отгрузки', to: '/supplier/shipments', icon: <Truck className="h-4 w-4" /> },
  { label: 'Маршруты (VRP)', to: '/supplier/routes', icon: <Map className="h-4 w-4" /> },
];

export function DashboardLayout({ children, mode }: { children: ReactNode; mode: 'buyer' | 'supplier' }) {
  const location = useLocation();
  const { profile, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const nav = mode === 'buyer' ? buyerNav : supplierNav;
  const displayName = profile?.full_name || user?.email || 'Пользователь';
  const roleLabel = mode === 'buyer' ? 'Покупатель' : 'Поставщик';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full">
      <aside className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col bg-sidebar transition-all duration-200',
        collapsed ? 'w-[58px]' : 'w-[246px]'
      )}>
        {/* Logo */}
        <div className="flex h-[var(--topbar-height)] items-center justify-between px-3 border-b border-sidebar-border">
          {!collapsed && (
            <Link to="/" className="rounded-md text-sidebar-primary transition-opacity hover:opacity-85">
              <AppLogo />
            </Link>
          )}
          {collapsed && (
            <Link to="/" className="mx-auto rounded-md text-sidebar-primary transition-opacity hover:opacity-85">
              <AppLogo compact />
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="rounded p-1 hover:bg-sidebar-accent transition-colors" aria-label="Свернуть меню">
            {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground" /> : <ChevronLeft className="h-3.5 w-3.5 text-sidebar-foreground" />}
          </button>
        </div>

        {/* Workspace label */}
        {!collapsed && (
          <div className="mx-3 mt-3 mb-1 flex items-center gap-2 rounded-md bg-sidebar-accent px-3 py-2 text-xs font-semibold text-sidebar-accent-foreground">
            {mode === 'buyer' ? <Building2 className="h-3.5 w-3.5" /> : <Factory className="h-3.5 w-3.5" />}
            {mode === 'buyer' ? 'Покупатель' : 'Поставщик'}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {nav.map(item => {
            const active = location.pathname === item.to || (item.to !== '/buyer' && item.to !== '/supplier' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              'flex items-center gap-2 rounded-md bg-sidebar-accent/55 px-3 py-2',
              collapsed && 'justify-center px-0'
            )}
            title={`${displayName} · ${roleLabel}`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">
              {initials || (mode === 'buyer' ? 'П' : 'С')}
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-sidebar-primary">{displayName}</span>
                <span className="mt-0.5 block text-[11px] text-sidebar-muted">{roleLabel}</span>
              </span>
            )}
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
