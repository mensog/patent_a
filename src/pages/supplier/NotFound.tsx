import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Legacy supplier RFQ demo screen used before Supabase wiring.
 * Kept as a lightweight placeholder so routes referencing it
 * don't crash, but without any mock data dependencies.
 */
export default function SupplierNotFound() {
  return (
    <DashboardLayout mode="supplier">
      <div className="max-w-2xl space-y-4">
        <Link to="/supplier" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-3 w-3" /> Назад в обзор
        </Link>
        <div className="card-panel p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="page-title">Экран в разработке</h1>
              <p className="text-sm text-muted-foreground">Этот макет с мок-данными отключён после перехода на Supabase.</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Для демо используйте страницы «Предложения», «Запросы» и «Отгрузки», которые уже читают данные из Supabase.
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm" className="text-xs h-8">
              <Link to="/supplier/offers">К каталогу</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs h-8">
              <Link to="/supplier/rfq">К запросам</Link>
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
