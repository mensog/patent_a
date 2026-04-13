import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Download, Info, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const validationResults = [
  { row: 1, material: 'Арматура А500С ∅12 мм', gost: 'ГОСТ 34028-2016', price: '49 100', unit: 'тонна', stock: '200 т', status: 'ok' as const },
  { row: 2, material: 'Труба проф. 60×40×3 мм', gost: 'ГОСТ 30245-2003', price: '62 500', unit: 'тонна', stock: '45 т', status: 'ok' as const },
  { row: 3, material: '', gost: '', price: '55 000', unit: 'тонна', stock: '30 т', status: 'error' as const, error: 'Не указано наименование материала' },
  { row: 4, material: 'Лист г/к ст3сп 4×1500×6000', gost: 'ГОСТ 19903-2015', price: '-100', unit: 'тонна', stock: '10 т', status: 'error' as const, error: 'Цена должна быть положительным числом' },
  { row: 5, material: 'Проволока Вр-1 ∅5 мм', gost: 'ГОСТ 6727-80', price: '47 700', unit: 'тонна', stock: '80 т', status: 'ok' as const },
  { row: 6, material: 'Швеллер 12П ст3пс5', gost: 'ГОСТ 8240-97', price: '54 300', unit: 'тонна', stock: '32 т', status: 'ok' as const },
  { row: 7, material: 'Арматура А500С ∅16 мм', gost: 'ГОСТ 34028-2016', price: '49 800', unit: 'тонна', stock: '150 т', status: 'ok' as const },
  { row: 8, material: 'Уголок 63×63×5', gost: 'ГОСТ 8509-93', price: '51 400', unit: 'тонна', stock: '25 т', status: 'warning' as const, error: 'Дубликат позиции — ГОСТ уже в каталоге' },
];

const templateColumns = [
  { name: 'Наименование', required: true, example: 'Арматура А500С ∅12 мм' },
  { name: 'ГОСТ / ТУ', required: false, example: 'ГОСТ 34028-2016' },
  { name: 'Цена, ₽', required: true, example: '49 100' },
  { name: 'Ед. измерения', required: true, example: 'тонна' },
  { name: 'Остаток', required: false, example: '200 т' },
  { name: 'Мин. заказ', required: false, example: '5 т' },
];

export default function PriceImport() {
  const [step, setStep] = useState<'upload' | 'validation'>('validation');
  const okCount = validationResults.filter(r => r.status === 'ok').length;
  const errCount = validationResults.filter(r => r.status === 'error').length;
  const warnCount = validationResults.filter(r => r.status === 'warning').length;

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Импорт прайс-листа</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Обновите каталог предложений из файла · Последний импорт: 10.03.2025, 1 247 позиций</p>
          </div>
          <Button variant="outline" className="gap-2 text-xs h-8">
            <Download className="h-3 w-3" /> Скачать шаблон .xlsx
          </Button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setStep('upload')} className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-colors ${step === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-bold">1</span>
            Загрузка
          </button>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <button onClick={() => setStep('validation')} className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-colors ${step === 'validation' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-bold">2</span>
            Валидация
          </button>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex items-center gap-2 rounded-md px-3 py-1.5 font-medium text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold">3</span>
            Применение
          </span>
        </div>

        {step === 'upload' && (
          <>
            {/* Upload zone */}
            <div className="card-panel border-dashed border-2 p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary/8">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">Перетащите файл или нажмите для выбора</h3>
              <p className="mt-2 text-sm text-muted-foreground">Форматы: .xlsx, .csv · до 10 000 строк · максимум 5 МБ</p>
              <Button variant="outline" className="mt-6 gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Выбрать файл
              </Button>
            </div>

            {/* Template specification */}
            <div className="card-panel">
              <div className="px-5 pt-5 pb-0 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="section-title">Структура файла</h3>
              </div>
              <div className="p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="table-header px-4 py-2.5 text-left">Столбец</th>
                      <th className="table-header px-4 py-2.5 text-center">Обязательный</th>
                      <th className="table-header px-4 py-2.5 text-left">Пример</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templateColumns.map((c, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2.5 font-medium">{c.name}</td>
                        <td className="px-4 py-2.5 text-center">
                          {c.required
                            ? <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
                            : <span className="text-xs text-muted-foreground">Нет</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{c.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {step === 'validation' && (
          <>
            {/* Summary strip */}
            <div className="grid grid-cols-4 gap-4">
              <div className="kpi-card">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Всего строк</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums">{validationResults.length}</p>
              </div>
              <div className="kpi-card">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Успешно</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-success">{okCount}</p>
              </div>
              <div className="kpi-card">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Предупреждения</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-warning">{warnCount}</p>
              </div>
              <div className="kpi-card">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ошибки</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-destructive">{errCount}</p>
              </div>
            </div>

            {/* Validation table */}
            <div className="card-panel">
              <div className="px-5 pt-5 pb-0 flex items-center justify-between">
                <h3 className="section-title">Результат валидации</h3>
                <span className="text-xs text-muted-foreground">price_list_2025-03-13.xlsx</span>
              </div>
              <div className="p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="table-header px-4 py-2.5 text-left w-12">№</th>
                      <th className="table-header px-4 py-2.5 text-center w-10"></th>
                      <th className="table-header px-4 py-2.5 text-left">Наименование</th>
                      <th className="table-header px-4 py-2.5 text-left">ГОСТ</th>
                      <th className="table-header px-4 py-2.5 text-right">Цена, ₽</th>
                      <th className="table-header px-4 py-2.5 text-right">Остаток</th>
                      <th className="table-header px-4 py-2.5 text-left">Замечание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResults.map(r => (
                      <tr key={r.row} className={`border-b last:border-0 ${r.status === 'error' ? 'bg-destructive/[0.03]' : r.status === 'warning' ? 'bg-warning/[0.03]' : ''}`}>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{r.row}</td>
                        <td className="px-4 py-3 text-center">
                          {r.status === 'ok' && <CheckCircle2 className="mx-auto h-4 w-4 text-success" />}
                          {r.status === 'error' && <AlertCircle className="mx-auto h-4 w-4 text-destructive" />}
                          {r.status === 'warning' && <AlertCircle className="mx-auto h-4 w-4 text-warning" />}
                        </td>
                        <td className="px-4 py-3 font-medium">{r.material || <span className="text-destructive italic text-xs">Пусто</span>}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{r.gost || '—'}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${r.status === 'error' ? 'text-destructive' : ''}`}>{r.price}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{r.stock}</td>
                        <td className="px-4 py-3 text-xs">
                          {r.status === 'error' && <span className="text-destructive">{r.error}</span>}
                          {r.status === 'warning' && <span className="text-warning">{r.error}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-5 flex items-center justify-between border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    {errCount > 0 ? `${errCount} ошибок необходимо исправить перед импортом` : 'Файл готов к импорту'}
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" className="text-xs h-8 gap-1">
                      <Download className="h-3 w-3" /> Отчёт валидации
                    </Button>
                    <Button className="text-xs h-8" disabled={errCount > 0}>
                      Импортировать {okCount + warnCount} позиций
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
