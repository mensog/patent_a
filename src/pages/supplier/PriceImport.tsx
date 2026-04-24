import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, CheckCircle2, Download, FileSpreadsheet, Info, Upload } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { MaterialPreview, SupplierOffer } from '@/types/app';

type ValidationStatus = 'ok' | 'warning' | 'error';
type ImportPhase = 'matching' | 'writing' | 'done' | 'error';

interface ParsedImportRow {
  row: number;
  materialName: string;
  materialId: string | null;
  unit: string;
  price: number | null;
  stock: number | null;
  minVolume: number | null;
  leadTimeDays: number | null;
  deliveryCost: number | null;
  vatRate: number;
  article: string | null;
  status: ValidationStatus;
  issue: string | null;
  action: 'create' | 'update';
}

interface ExistingOfferMapEntry {
  id: string;
  materialId: string;
}

interface ImportProgressState {
  phase: ImportPhase;
  current: number;
  total: number;
  message: string;
  createdMaterials: number;
  createdOffers: number;
  updatedOffers: number;
}

const templateColumns = [
  { name: 'Наименование', required: true, example: 'Арматура А500С ∅12 мм' },
  { name: 'Артикул', required: false, example: 'A500C-12' },
  { name: 'Цена', required: true, example: '49100' },
  { name: 'Ед. измерения', required: true, example: 'т' },
  { name: 'Остаток', required: false, example: '200' },
  { name: 'Мин. заказ', required: false, example: '5' },
  { name: 'Срок, дн.', required: false, example: '3' },
  { name: 'Доставка', required: false, example: '2500' },
  { name: 'НДС', required: false, example: '20' },
];

const importCategoryName = 'Импорт прайс-листов';
const importCategorySlug = 'price-import';

function normalizeKey(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeMatchValue(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[№#]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseOptionalNumber(value: unknown) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMaterialDedupKey(materialName: string, unit: string, article: string | null) {
  const normalizedArticle = article ? normalizeMatchValue(article) : '';
  if (normalizedArticle) {
    return `sku:${normalizedArticle}`;
  }

  return `name:${normalizeMatchValue(materialName)}::unit:${normalizeMatchValue(unit)}`;
}

function getCellValue(row: Record<string, unknown>, aliases: string[]) {
  const entry = Object.entries(row).find(([key]) => aliases.includes(normalizeKey(key)));
  return entry?.[1];
}

function buildMaterialLookup(materials: MaterialPreview[]) {
  const byId = new Map(materials.map((material) => [material.id, material]));
  const byName = new Map(materials.map((material) => [normalizeKey(material.name), material]));
  const bySearchName = new Map(materials.map((material) => [normalizeMatchValue(material.name), material]));
  const bySku = new Map(
    materials
      .filter((material) => material.sku)
      .map((material) => [normalizeMatchValue(material.sku), material] as const),
  );

  return { byId, byName, bySearchName, bySku };
}

function resolveMaterial(
  materialName: string,
  article: string | null,
  materials: MaterialPreview[],
  lookup: ReturnType<typeof buildMaterialLookup>,
) {
  const normalizedArticle = article ? normalizeMatchValue(article) : '';
  const normalizedMaterialName = normalizeMatchValue(materialName);

  const byArticle = normalizedArticle ? lookup.bySku.get(normalizedArticle) : null;
  if (byArticle) {
    return byArticle;
  }

  const byExactName = lookup.byName.get(normalizeKey(materialName));
  if (byExactName) {
    return byExactName;
  }

  const byNormalizedName = lookup.bySearchName.get(normalizedMaterialName);
  if (byNormalizedName) {
    return byNormalizedName;
  }

  return (
    materials.find((material) => {
      const normalizedCandidate = normalizeMatchValue(material.name);
      return (
        normalizedCandidate.includes(normalizedMaterialName) ||
        normalizedMaterialName.includes(normalizedCandidate)
      );
    }) ?? null
  );
}

function buildExistingOffersLookup(offers: SupplierOffer[]) {
  return new Map<string, ExistingOfferMapEntry>(
    offers.map((offer) => [
      offer.material_id,
      {
        id: offer.id,
        materialId: offer.material_id,
      },
    ]),
  );
}

export default function PriceImport() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const companyId = profile?.company_id;
  const [step, setStep] = useState<'upload' | 'validation'>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [autoCreateMaterials, setAutoCreateMaterials] = useState(true);
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null);

  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ['materials-import'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('id, name, sku, unit').order('name');
      if (error) throw error;
      return (data ?? []) as MaterialPreview[];
    },
  });

  const { data: existingOffers = [] } = useQuery({
    queryKey: ['supplier-offers-import', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('supplier_offers')
        .select('*')
        .eq('supplier_company_id', companyId);
      if (error) throw error;
      return (data ?? []) as SupplierOffer[];
    },
    enabled: !!companyId,
  });

  const summary = useMemo(() => ({
    total: rows.length,
    ok: rows.filter((row) => row.status === 'ok').length,
    warning: rows.filter((row) => row.status === 'warning').length,
    error: rows.filter((row) => row.status === 'error').length,
  }), [rows]);

  const progressValue = useMemo(() => {
    if (!importProgress) {
      return 0;
    }

    if (importProgress.phase === 'done') {
      return 100;
    }

    if (!importProgress.total) {
      return 0;
    }

    const phaseProgress = (importProgress.current / importProgress.total) * 50;

    if (importProgress.phase === 'matching') {
      return Math.round(phaseProgress);
    }

    return Math.round(50 + phaseProgress);
  }, [importProgress]);

  const progressStageLabel = useMemo(() => {
    if (!importProgress) {
      return null;
    }

    switch (importProgress.phase) {
      case 'matching':
        return 'Этап 1 из 2';
      case 'writing':
        return 'Этап 2 из 2';
      case 'done':
        return 'Завершено';
      case 'error':
        return 'Ошибка';
      default:
        return null;
    }
  }, [importProgress]);

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) {
        throw new Error('Компания поставщика не определена.');
      }

      const offersLookup = buildExistingOffersLookup(existingOffers);
      const knownMaterials = [...materials];
      const materialLookup = buildMaterialLookup(knownMaterials);
      let createdCategoryId: string | null = null;

      const syncMaterialLookup = (material: MaterialPreview) => {
        knownMaterials.push(material);
        materialLookup.byId.set(material.id, material);
        materialLookup.byName.set(normalizeKey(material.name), material);
        materialLookup.bySearchName.set(normalizeMatchValue(material.name), material);

        if (material.sku) {
          materialLookup.bySku.set(normalizeMatchValue(material.sku), material);
        }
      };

      const ensureImportCategoryId = async () => {
        if (createdCategoryId) {
          return createdCategoryId;
        }

        const { data: existingCategory, error: categoryLookupError } = await supabase
          .from('material_categories')
          .select('id')
          .eq('name', importCategoryName)
          .maybeSingle();

        if (categoryLookupError) {
          throw categoryLookupError;
        }

        if (existingCategory?.id) {
          createdCategoryId = existingCategory.id;
          return createdCategoryId;
        }

        const { data: nextCategory, error: categoryInsertError } = await supabase
          .from('material_categories')
          .insert({
            name: importCategoryName,
            slug: importCategorySlug,
          })
          .select('id')
          .single();

        if (categoryInsertError || !nextCategory) {
          throw categoryInsertError ?? new Error('Не удалось создать категорию для импорта.');
        }

        createdCategoryId = nextCategory.id;
        return createdCategoryId;
      };

      const importRows = rows.filter(
        (row) =>
          row.status !== 'error' &&
          row.materialName.trim() &&
          row.unit.trim() &&
          row.price !== null &&
          row.price > 0,
      );

      if (!importRows.length) {
        throw new Error('Нет валидных строк для импорта.');
      }

      setImportProgress({
        phase: 'matching',
        current: 0,
        total: importRows.length,
        message: autoCreateMaterials
          ? 'Проверяем строки и создаём отсутствующие материалы'
          : 'Проверяем строки и сопоставляем их со справочником',
        createdMaterials: 0,
        createdOffers: 0,
        updatedOffers: 0,
      });

      const rowsByMaterialId = new Map<string, ParsedImportRow>();
      const createdMaterialsByKey = new Map<string, MaterialPreview>();

      for (const [index, row] of importRows.entries()) {
        let resolvedMaterial =
          row.materialId
            ? materialLookup.byId.get(row.materialId) ?? null
            : resolveMaterial(row.materialName, row.article, knownMaterials, materialLookup);
        let createdMaterial = false;

        if (!resolvedMaterial && autoCreateMaterials) {
          const dedupKey = getMaterialDedupKey(row.materialName, row.unit, row.article);
          const cachedCreatedMaterial = createdMaterialsByKey.get(dedupKey);

          if (cachedCreatedMaterial) {
            resolvedMaterial = cachedCreatedMaterial;
          } else {
            const categoryId = await ensureImportCategoryId();
            const { data: insertedMaterial, error: materialInsertError } = await supabase
              .from('materials')
              .insert({
                category_id: categoryId,
                description: 'Создано автоматически из импорта прайс-листа поставщика.',
                name: row.materialName.trim(),
                sku: row.article?.trim() || null,
                unit: row.unit.trim(),
              })
              .select('id, name, sku, unit')
              .single();

            if (materialInsertError || !insertedMaterial) {
              throw materialInsertError ?? new Error(`Не удалось создать материал "${row.materialName}".`);
            }

            resolvedMaterial = insertedMaterial as MaterialPreview;
            createdMaterialsByKey.set(dedupKey, resolvedMaterial);
            syncMaterialLookup(resolvedMaterial);
            createdMaterial = true;
          }
        }

        if (!resolvedMaterial) {
          setImportProgress((currentProgress) => currentProgress ? {
            ...currentProgress,
            current: index + 1,
          } : null);
          continue;
        }

        rowsByMaterialId.set(resolvedMaterial.id, {
          ...row,
          materialId: resolvedMaterial.id,
          unit: row.unit.trim() || resolvedMaterial.unit,
        });

        setImportProgress((currentProgress) => currentProgress ? {
          ...currentProgress,
          current: index + 1,
          createdMaterials: currentProgress.createdMaterials + (createdMaterial ? 1 : 0),
        } : null);
      }

      const validRows = Array.from(rowsByMaterialId.values());

      if (!validRows.length) {
        throw new Error('После сопоставления со справочником не осталось строк для импорта.');
      }

      setImportProgress((currentProgress) => currentProgress ? {
        ...currentProgress,
        phase: 'writing',
        current: 0,
        total: validRows.length,
        message: 'Создаём и обновляем предложения поставщика',
      } : null);

      for (const [index, row] of validRows.entries()) {
        const existing = offersLookup.get(row.materialId!);
        const payload = {
          article: row.article,
          currency: 'RUB',
          delivery_cost: row.deliveryCost,
          is_active: true,
          lead_time_days: row.leadTimeDays,
          material_id: row.materialId!,
          min_volume: row.minVolume,
          price: row.price!,
          stock: row.stock,
          supplier_company_id: companyId,
          vat_rate: row.vatRate,
        };

        if (existing) {
          const { error } = await supabase
            .from('supplier_offers')
            .update(payload)
            .eq('id', existing.id)
            .eq('supplier_company_id', companyId);

          if (error) throw error;
        } else {
          const { data: insertedOffer, error } = await supabase
            .from('supplier_offers')
            .insert(payload)
            .select('id, material_id')
            .single();

          if (error) throw error;

          if (insertedOffer) {
            offersLookup.set(insertedOffer.material_id, {
              id: insertedOffer.id,
              materialId: insertedOffer.material_id,
            });
          }
        }

        setImportProgress((currentProgress) => currentProgress ? {
          ...currentProgress,
          current: index + 1,
          createdOffers: currentProgress.createdOffers + (existing ? 0 : 1),
          updatedOffers: currentProgress.updatedOffers + (existing ? 1 : 0),
        } : null);
      }
    },
    onSuccess: async () => {
      setImportProgress((currentProgress) => currentProgress ? {
        ...currentProgress,
        phase: 'done',
        current: currentProgress.total,
        message: 'Импорт завершён без ошибок',
      } : null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['material-categories'] }),
        queryClient.invalidateQueries({ queryKey: ['materials'] }),
        queryClient.invalidateQueries({ queryKey: ['materials-for-rfq'] }),
        queryClient.invalidateQueries({ queryKey: ['materials-for-offers'] }),
        queryClient.invalidateQueries({ queryKey: ['materials-import'] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-all-offers', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-offers-summary', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-offers-import', companyId] }),
      ]);
      toast({ title: 'Прайс-лист импортирован' });
    },
    onError: (error: Error) => {
      const errorMessage = error.message.toLowerCase();
      const rlsError =
        errorMessage.includes('row-level security') || errorMessage.includes('violates row-level security');

      setImportProgress((currentProgress) => currentProgress ? {
        ...currentProgress,
        phase: 'error',
        message: rlsError
          ? 'Импорт остановлен: на Supabase не хватает RLS policy для записи в справочник'
          : error.message,
      } : null);

      toast({
        title: 'Не удалось применить импорт',
        description: rlsError
          ? 'На удалённом Supabase ещё не применена migration с INSERT policy для material_categories/materials.'
          : error.message,
        variant: 'destructive',
      });
    },
  });

  const parseWorkbook = async (file: File) => {
    if (materials.length === 0 && !autoCreateMaterials) {
      toast({
        title: 'Справочник материалов пуст',
        description: 'Либо включите авто-создание материалов, либо заранее заполните таблицу materials.',
        variant: 'destructive',
      });
      return;
    }

    setImportProgress(null);
    setParsing(true);

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
      const materialLookup = buildMaterialLookup(materials);
      const offersLookup = buildExistingOffersLookup(existingOffers);

      const parsedRows: ParsedImportRow[] = rawRows.map((row, index) => {
        const materialName = String(
          getCellValue(row, ['наименование', 'материал', 'material', 'name']) ?? '',
        ).trim();
        const article = String(
          getCellValue(row, ['артикул', 'sku', 'article']) ?? '',
        ).trim() || null;
        const unit = String(
          getCellValue(row, ['ед. измерения', 'единица', 'ед', 'unit']) ?? '',
        ).trim();
        const price = parseOptionalNumber(getCellValue(row, ['цена', 'price', 'цена, ₽']));
        const stock = parseOptionalNumber(getCellValue(row, ['остаток', 'stock']));
        const minVolume = parseOptionalNumber(getCellValue(row, ['мин. заказ', 'минимальный заказ', 'min order']));
        const leadTimeDays = parseOptionalNumber(getCellValue(row, ['срок, дн.', 'срок', 'lead time']));
        const deliveryCost = parseOptionalNumber(getCellValue(row, ['доставка', 'delivery cost']));
        const vatRate = parseOptionalNumber(getCellValue(row, ['ндс', 'vat'])) ?? 20;
        const matchedMaterial = resolveMaterial(materialName, article, materials, materialLookup);
        const existingOffer = matchedMaterial ? offersLookup.get(matchedMaterial.id) : null;

        let status: ValidationStatus = 'ok';
        let issue: string | null = null;

        if (!materialName) {
          status = 'error';
          issue = 'Не указано наименование материала';
        } else if (!matchedMaterial && !autoCreateMaterials) {
          status = 'error';
          issue = 'Материал не найден в справочнике';
        } else if (!unit) {
          status = 'error';
          issue = 'Не указана единица измерения';
        } else if (price === null || price <= 0) {
          status = 'error';
          issue = 'Цена должна быть положительным числом';
        } else if (!matchedMaterial && autoCreateMaterials) {
          status = 'warning';
          issue = 'Материал отсутствует в справочнике и будет создан автоматически';
        } else if (existingOffer) {
          status = 'warning';
          issue = 'Позиция уже существует и будет обновлена';
        }

        return {
          row: index + 2,
          materialName,
          materialId: matchedMaterial?.id ?? null,
          unit: unit || matchedMaterial?.unit || '',
          price,
          stock,
          minVolume,
          leadTimeDays,
          deliveryCost,
          vatRate,
          article,
          status,
          issue,
          action: existingOffer ? 'update' : 'create',
        };
      });

      setRows(parsedRows);
      setFileName(file.name);
      setStep('validation');
    } catch (error) {
      toast({
        title: 'Не удалось прочитать файл',
        description: error instanceof Error ? error.message : 'Проверьте формат файла.',
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Импорт прайс-листа</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Загрузите `.xlsx`, `.xls` или `.csv` и обновите `supplier_offers` из файла.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {materialsLoading
                ? 'Загружаем справочник материалов...'
                : `Доступно материалов в справочнике: ${materials.length}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 text-xs h-8"
              onClick={() => {
                const header = templateColumns.map((column) => column.name);
                const sample = ['Арматура А500С 12 мм', 'A500C-12', '49100', 'т', '200', '5', '3', '2500', '20'];
                const worksheet = XLSX.utils.aoa_to_sheet([header, sample]);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'price-list');
                XLSX.writeFile(workbook, 'ecamarket-price-template.xlsx');
              }}
            >
              <Download className="h-3 w-3" /> Скачать общий шаблон
            </Button>

            <Button
              variant="outline"
              className="gap-2 text-xs h-8"
              disabled={materials.length === 0}
              onClick={() => {
                const rows = materials.slice(0, 200).map((material, index) => ({
                  'Наименование': material.name,
                  'Артикул': material.sku ?? '',
                  'Цена': 500 + index * 25,
                  'Ед. измерения': material.unit,
                  'Остаток': 50 + index * 3,
                  'Мин. заказ': 1,
                  'Срок, дн.': 2 + (index % 5),
                  'Доставка': 1500 + (index % 6) * 300,
                  'НДС': 20,
                }));

                const worksheet = XLSX.utils.json_to_sheet(rows, {
                  header: templateColumns.map((column) => column.name),
                });
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'price-list');
                XLSX.writeFile(workbook, 'ecamarket-price-template-from-materials.xlsx');
              }}
            >
              <Download className="h-3 w-3" /> Скачать из справочника
            </Button>
          </div>
        </div>

        {materials.length === 0 && !materialsLoading && (
          <div className="rounded-lg border border-warning/30 bg-warning/[0.05] p-4 text-sm text-muted-foreground">
            В таблице `materials` сейчас нет позиций. Импорт может сам создать справочник из Excel, если включено
            авто-создание материалов.
          </div>
        )}

        <div className="rounded-lg border bg-muted/40 p-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={autoCreateMaterials}
              onChange={(event) => {
                setAutoCreateMaterials(event.target.checked);
                setImportProgress(null);
                if (rows.length > 0) {
                  setRows([]);
                  setFileName(null);
                  setStep('upload');
                }
              }}
            />
            <span>
              <span className="font-medium text-foreground">Создавать отсутствующие материалы автоматически</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Если строка из прайс-листа не найдена в `materials`, система создаст новый материал в категории
                {' '}
                «{importCategoryName}». Повторы внутри одного файла не создают дубли: будет использована
                последняя строка для совпавшего `sku` или пары `наименование + единица`.
              </span>
            </span>
          </label>
        </div>

        {importProgress && (
          <div
            className={`rounded-lg border p-4 ${
              importProgress.phase === 'error'
                ? 'border-destructive/30 bg-destructive/[0.05]'
                : importProgress.phase === 'done'
                  ? 'border-success/30 bg-success/[0.05]'
                  : 'bg-card'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Прогресс импорта</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {progressStageLabel ? `${progressStageLabel} · ` : ''}
                  {importProgress.message}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">{progressValue}%</span>
            </div>

            <Progress value={progressValue} className="mt-3 h-2" />

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>
                Шаг: {Math.min(importProgress.current, importProgress.total)} / {importProgress.total}
              </span>
              <span>Материалов создано: {importProgress.createdMaterials}</span>
              <span>Предложений создано: {importProgress.createdOffers}</span>
              <span>Предложений обновлено: {importProgress.updatedOffers}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setStep('upload')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-colors ${step === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-bold">1</span>
            Загрузка
          </button>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <button
            onClick={() => rows.length > 0 && setStep('validation')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-colors ${step === 'validation' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-bold">2</span>
            Валидация
          </button>
        </div>

        {step === 'upload' && (
          <>
            <div className="card-panel border-dashed border-2 p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary/8">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">Выберите файл прайс-листа</h3>
              <p className="mt-2 text-sm text-muted-foreground">Поддерживаются `.xlsx`, `.xls`, `.csv`</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void parseWorkbook(file);
                  }
                }}
              />
              <Button variant="outline" className="mt-6 gap-2" onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="h-4 w-4" />
                {parsing ? 'Чтение файла…' : 'Выбрать файл'}
              </Button>
              {fileName && <p className="mt-3 text-xs text-muted-foreground">Последний файл: {fileName}</p>}
            </div>

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
                    {templateColumns.map((column) => (
                      <tr key={column.name} className="border-b last:border-0">
                        <td className="px-4 py-2.5 font-medium">{column.name}</td>
                        <td className="px-4 py-2.5 text-center">
                          {column.required
                            ? <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
                            : <span className="text-xs text-muted-foreground">Нет</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{column.example}</td>
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
            <div className="grid grid-cols-4 gap-4">
              <div className="kpi-card">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Всего строк</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums">{summary.total}</p>
              </div>
              <div className="kpi-card">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Успешно</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-success">{summary.ok}</p>
              </div>
              <div className="kpi-card">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Предупреждения</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-warning">{summary.warning}</p>
              </div>
              <div className="kpi-card">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ошибки</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-destructive">{summary.error}</p>
              </div>
            </div>

            <div className="card-panel">
              <div className="px-5 pt-5 pb-0 flex items-center justify-between">
                <h3 className="section-title">Результат валидации</h3>
                <span className="text-xs text-muted-foreground">{fileName ?? 'Файл не выбран'}</span>
              </div>
              <div className="p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="table-header px-4 py-2.5 text-left w-12">№</th>
                      <th className="table-header px-4 py-2.5 text-center w-10"></th>
                      <th className="table-header px-4 py-2.5 text-left">Наименование</th>
                      <th className="table-header px-4 py-2.5 text-right">Цена</th>
                      <th className="table-header px-4 py-2.5 text-right">Остаток</th>
                      <th className="table-header px-4 py-2.5 text-left">Действие</th>
                      <th className="table-header px-4 py-2.5 text-left">Замечание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`${row.row}-${row.materialName}`} className={`border-b last:border-0 ${row.status === 'error' ? 'bg-destructive/[0.03]' : row.status === 'warning' ? 'bg-warning/[0.03]' : ''}`}>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{row.row}</td>
                        <td className="px-4 py-3 text-center">
                          {row.status === 'ok' && <CheckCircle2 className="mx-auto h-4 w-4 text-success" />}
                          {row.status === 'warning' && <AlertCircle className="mx-auto h-4 w-4 text-warning" />}
                          {row.status === 'error' && <AlertCircle className="mx-auto h-4 w-4 text-destructive" />}
                        </td>
                        <td className="px-4 py-3 font-medium">{row.materialName || '—'}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${row.status === 'error' ? 'text-destructive' : ''}`}>{row.price ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{row.stock ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{row.action === 'update' ? 'Обновление' : 'Создание'}</td>
                        <td className="px-4 py-3 text-xs">
                          {row.issue ? (
                            <span className={row.status === 'error' ? 'text-destructive' : row.status === 'warning' ? 'text-warning' : 'text-muted-foreground'}>
                              {row.issue}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-5 flex items-center justify-between border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    {summary.error > 0
                      ? `${summary.error} строк с ошибками не будут импортированы`
                      : 'Файл готов к применению'}
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" className="text-xs h-8" onClick={() => setStep('upload')}>
                      Загрузить другой файл
                    </Button>
                    <Button className="text-xs h-8" disabled={applyMutation.isPending || rows.length === 0} onClick={() => applyMutation.mutate()}>
                      {applyMutation.isPending ? `Импорт… ${progressValue}%` : `Импортировать ${summary.ok + summary.warning} позиций`}
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
