import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Topbar } from './Topbar';
import {
  LayoutDashboard, Search, FileText, ShoppingCart, Truck,
  Package, Upload, Map, ArrowLeftRight, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
}

const buyerNav: NavItem[] = [
  { label: 'Обзор', to: '/buyer', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Каталог', to: '/buyer/catalog', icon: <Search className="h-4 w-4" /> },
  { label: 'Запросы (RFQ)', to: '/buyer/rfq', icon: <FileText className="h-4 w-4" /> },
  { label: 'Заказы', to: '/buyer/orders/1', icon: <ShoppingCart className="h-4 w-4" /> },
];

const supplierNav: NavItem[] = [
  { label: 'Обзор', to: '/supplier', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Предложения', to: '/supplier/offers', icon: <Package className="h-4 w-4" /> },
  { label: 'Импорт прайса', to: '/supplier/import', icon: <Upload className="h-4 w-4" /> },
  { label: 'Запросы (RFQ)', to: '/supplier/rfq/1', icon: <FileText className="h-4 w-4" /> },
  { label: 'Отгрузки', to: '/supplier/shipments/1', icon: <Truck className="h-4 w-4" /> },
  { label: 'Маршруты', to: '/supplier/routes', icon: <Map className="h-4 w-4" /> },
];

export function DashboardLayout({ children, mode }: { children: ReactNode; mode: 'buyer' | 'supplier' }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const nav = mode === 'buyer' ? buyerNav : supplierNav;

  return (
    <div className="flex min-h-screen w-full">
      <aside className={cn(
        'sticky top-0 flex h-screen flex-col bg-sidebar transition-all duration-200',
        collapsed ? 'w-[56px]' : 'w-56'
      )}>
        {/* Logo */}
        <div className="flex h-[var(--topbar-height)] items-center justify-between px-3 border-b border-sidebar-border">
          {!collapsed && (
            <Link to="/" className="text-sm font-bold text-sidebar-primary tracking-tight">
              EcaMarket
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="rounded p-1 hover:bg-sidebar-accent transition-colors">
            {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground" /> : <ChevronLeft className="h-3.5 w-3.5 text-sidebar-foreground" />}
          </button>
        </div>

        {/* Workspace label */}
        {!collapsed && (
          <div className="mx-3 mt-3 mb-1 rounded-md bg-sidebar-accent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-accent-foreground">
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
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors',
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

        {/* Switch workspace */}
        <div className="border-t border-sidebar-border p-2">
          <Link
            to={mode === 'buyer' ? '/supplier' : '/buyer'}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-[11px] font-medium text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {!collapsed && <span>{mode === 'buyer' ? 'Кабинет поставщика' : 'Кабинет покупателя'}</span>}
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
