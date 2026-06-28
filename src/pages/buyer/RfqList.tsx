import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/app-utils';
import { createNotificationsForCompanyUsers } from '@/lib/notifications';
import type { MaterialPreview, Rfq, RfqStatus } from '@/types/app';

interface RfqFormItem {
  id: string;
  materialId: string;
  quantity: string;
  unit: string;
  comment: string;
}

interface SupplierCandidate {
  id: string;
  name: string;
}

interface RfqFormState {
  title: string;
  description: string;
  deliveryAddress: string;
  neededBy: string;
  items: RfqFormItem[];
  supplierIds: string[];
}

const createItem = (index: number): RfqFormItem => ({
  id: `item-${index}`,
  materialId: '',
  quantity: '',
  unit: 'т',
  comment: '',
});

const createInitialForm = (): RfqFormState => ({
  title: '',
  description: '',
  deliveryAddress: '',
  neededBy: '',
  items: [createItem(1)],
  supplierIds: [],
});

const RFQ_DRAFT_STORAGE_KEY = 'ecamarket:buyer-rfq-draft';

const readStoredDraft = (): { isOpen: boolean; form: RfqFormState } | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawDraft = window.sessionStorage.getItem(RFQ_DRAFT_STORAGE_KEY);
    return rawDraft ? JSON.parse(rawDraft) : null;
  } catch {
    return null;
  }
};

const writeStoredDraft = (form: RfqFormState) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(RFQ_DRAFT_STORAGE_KEY, JSON.stringify({ isOpen: true, form }));
};

const clearStoredDraft = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(RFQ_DRAFT_STORAGE_KEY);
};

export default function RfqList() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(() => readStoredDraft()?.isOpen ?? false);
  const [form, setForm] = useState<RfqFormState>(() => readStoredDraft()?.form ?? createInitialForm());
  const [supplierSearch, setSupplierSearch] = useState('');
  const prefilledMaterialIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (dialogOpen) {
      writeStoredDraft(form);
    }
  }, [dialogOpen, form]);

  const { data: rfqs = [], isLoading, error } = useQuery({
    queryKey: ['buyer-all-rfqs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error: queryError } = await supabase
        .from('rfqs')
        .select('id, title, status, needed_by, created_at, description')
        .eq('buyer_company_id', companyId)
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      return (data ?? []) as Pick<Rfq, 'id' | 'title' | 'status' | 'needed_by' | 'created_at' | 'description'>[];
    },
    enabled: !!companyId,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials-for-rfq'],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('materials')
        .select('id, name, sku, unit')
        .order('name');

      if (queryError) {
        throw queryError;
      }

      return (data ?? []) as MaterialPreview[];
    },
  });

  useEffect(() => {
    const materialId = searchParams.get('materialId');
    const supplierId = searchParams.get('supplierId');
    if (!materialId || prefilledMaterialIdRef.current === materialId || !materials.length) {
      return;
    }

    const material = materials.find((entry) => entry.id === materialId);
    if (!material) {
      return;
    }

    prefilledMaterialIdRef.current = materialId;
    const prefillSupplierIds = async () => {
      if (supplierId) {
        return [supplierId];
      }

      const { data, error: queryError } = await supabase
        .from('supplier_offers')
        .select('supplier_company_id')
        .eq('material_id', materialId)
        .eq('is_active', true);

      if (queryError) {
        console.warn('Не удалось подобрать поставщиков по материалу:', queryError.message);
        return [];
      }

      return Array.from(new Set((data ?? []).map((offer) => offer.supplier_company_id)));
    };

    setForm((current) => ({
      ...current,
      title: current.title || `Закупка: ${material.name}`,
      items: [
        {
          ...createItem(1),
          materialId: material.id,
          unit: material.unit || 'шт',
          quantity: current.items[0]?.quantity || '',
        },
      ],
    }));
    void prefillSupplierIds().then((supplierIds) => {
      if (!supplierIds.length) {
        return;
      }

      setForm((current) => ({
        ...current,
        supplierIds: Array.from(new Set([...current.supplierIds, ...supplierIds])),
      }));
    });
    setDialogOpen(true);
    setSearchParams({}, { replace: true });
  }, [materials, searchParams, setSearchParams]);

  const { data: supplierCandidates = [] } = useQuery({
    queryKey: ['rfq-supplier-candidates'],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('supplier_offers')
        .select('supplier_company_id, companies!supplier_offers_supplier_company_id_fkey(name)')
        .eq('is_active', true)
        .limit(200);

      if (queryError) {
        throw queryError;
      }

      const unique = new Map<string, SupplierCandidate>();

      data?.forEach((item) => {
        const companyName = item.companies?.name;
        if (companyName && !unique.has(item.supplier_company_id)) {
          unique.set(item.supplier_company_id, {
            id: item.supplier_company_id,
            name: companyName,
          });
        }
      });

      return Array.from(unique.values()).sort((left, right) => left.name.localeCompare(right.name, 'ru'));
    },
  });

  const rfqIds = rfqs.map((rfq) => rfq.id);

  const { data: rfqItemCounts = {} } = useQuery({
    queryKey: ['buyer-rfq-item-counts', rfqIds.join('|')],
    queryFn: async () => {
      if (!rfqIds.length) return {};
      const { data, error: queryError } = await supabase
        .from('rfq_items')
        .select('rfq_id')
        .in('rfq_id', rfqIds);

      if (queryError) {
        throw queryError;
      }

      return (data ?? []).reduce<Record<string, number>>((accumulator, item) => {
        accumulator[item.rfq_id] = (accumulator[item.rfq_id] ?? 0) + 1;
        return accumulator;
      }, {});
    },
    enabled: rfqIds.length > 0,
  });

  const { data: quoteCounts = {} } = useQuery({
    queryKey: ['buyer-rfq-quote-counts', rfqIds.join('|')],
    queryFn: async () => {
      if (!rfqIds.length) return {};
      const { data, error: queryError } = await supabase
        .from('quotes')
        .select('rfq_id')
        .in('rfq_id', rfqIds);

      if (queryError) {
        throw queryError;
      }

      return (data ?? []).reduce<Record<string, number>>((accumulator, quote) => {
        accumulator[quote.rfq_id] = (accumulator[quote.rfq_id] ?? 0) + 1;
        return accumulator;
      }, {});
    },
    enabled: rfqIds.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: RfqFormState) => {
      if (!companyId || !user?.id) {
        throw new Error('Профиль пользователя не готов к созданию запроса на закупку.');
      }

      const validItems = payload.items.filter((item) => item.materialId && Number(item.quantity) > 0);

      if (!payload.title.trim()) {
        throw new Error('Укажите название запроса.');
      }

      if (!validItems.length) {
        throw new Error('Добавьте хотя бы одну позицию.');
      }

      if (!payload.supplierIds.length) {
        throw new Error('Выберите хотя бы одного поставщика.');
      }

      const { data: rfq, error: rfqError } = await supabase
        .from('rfqs')
        .insert({
          title: payload.title.trim(),
          description: payload.description.trim() || null,
          delivery_address: payload.deliveryAddress.trim() || null,
          needed_by: payload.neededBy || null,
          buyer_company_id: companyId,
          created_by: user.id,
          status: 'published' as RfqStatus,
        })
        .select('id')
        .single();

      if (rfqError || !rfq) {
        throw rfqError ?? new Error('Не удалось создать запрос на закупку.');
      }

      const itemsPayload = validItems.map((item) => {
        const material = materials.find((entry) => entry.id === item.materialId);

        return {
          rfq_id: rfq.id,
          material_id: item.materialId,
          material_name: material?.name ?? null,
          quantity: Number(item.quantity),
          unit: item.unit.trim() || material?.unit || 'шт',
          comment: item.comment.trim() || null,
        };
      });

      const { error: itemsError } = await supabase.from('rfq_items').insert(itemsPayload);

      if (itemsError) {
        throw itemsError;
      }

      const invitesPayload = payload.supplierIds.map((supplierId) => ({
        rfq_id: rfq.id,
        supplier_company_id: supplierId,
      }));

      const { error: invitesError } = await supabase.from('rfq_suppliers').insert(invitesPayload);

      if (invitesError) {
        throw invitesError;
      }

      await createNotificationsForCompanyUsers(payload.supplierIds, {
        type: 'rfq',
        title: 'Новый запрос на коммерческое предложение',
        body: `Покупатель опубликовал запрос на закупку "${payload.title.trim()}". Проверьте позиции и подготовьте коммерческое предложение.`,
        related_entity_id: rfq.id,
        related_entity_type: 'rfq',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['buyer-all-rfqs', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['buyer-rfqs', companyId] }),
      ]);
      setDialogOpen(false);
      setForm(createInitialForm());
      clearStoredDraft();
      toast({ title: 'Запрос на закупку создан' });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Не удалось создать запрос на закупку',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const updateItem = (itemId: string, field: keyof Omit<RfqFormItem, 'id'>, value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    }));
  };

  const toggleSupplier = (supplierId: string) => {
    setForm((current) => ({
      ...current,
      supplierIds: current.supplierIds.includes(supplierId)
        ? current.supplierIds.filter((id) => id !== supplierId)
        : [...current.supplierIds, supplierId],
    }));
  };

  const selectSuppliers = (supplierIds: string[]) => {
    setForm((current) => ({
      ...current,
      supplierIds: Array.from(new Set([...current.supplierIds, ...supplierIds])),
    }));
  };

  const clearSuppliers = (supplierIds?: string[]) => {
    setForm((current) => {
      const idsToClear = supplierIds ? new Set(supplierIds) : null;
      return {
        ...current,
        supplierIds: idsToClear
          ? current.supplierIds.filter((supplierId) => !idsToClear.has(supplierId))
          : [],
      };
    });
  };

  const normalizedSupplierSearch = supplierSearch.trim().toLocaleLowerCase('ru-RU');
  const visibleSupplierCandidates = normalizedSupplierSearch
    ? supplierCandidates.filter((supplier) => supplier.name.toLocaleLowerCase('ru-RU').includes(normalizedSupplierSearch))
    : supplierCandidates;
  const visibleSupplierIds = visibleSupplierCandidates.map((supplier) => supplier.id);
  const selectedVisibleCount = visibleSupplierIds.filter((supplierId) => form.supplierIds.includes(supplierId)).length;

  const openDialog = () => {
    setForm({
      ...createInitialForm(),
      items: [
        {
          ...createItem(1),
          materialId: materials[0]?.id ?? '',
          unit: materials[0]?.unit ?? 'т',
        },
      ],
    });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout mode="buyer">
      <div className="demo-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Запросы на закупку</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{rfqs.length} запросов</p>
          </div>
          <Button className="gap-2 text-xs" onClick={openDialog}>
            <Plus className="h-3.5 w-3.5" /> Новый запрос
          </Button>
        </div>

        <div className="card-panel">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : error ? (
            <p className="py-16 text-center text-sm text-destructive">Не удалось загрузить запросы на закупку.</p>
          ) : rfqs.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Нет запросов</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="table-header p-4 text-left">№</th>
                  <th className="table-header p-4 text-left">Название</th>
                  <th className="table-header p-4 text-center">Позиции</th>
                  <th className="table-header p-4 text-center">Предложений получено</th>
                  <th className="table-header p-4 text-center">Статус</th>
                  <th className="table-header p-4 text-left">Создан</th>
                  <th className="table-header p-4 text-left">Дедлайн</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq, index) => (
                  <tr key={rfq.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="p-4 font-mono text-xs text-muted-foreground">#{index + 1}</td>
                    <td className="p-4">
                      <Link
                        to={`/buyer/rfq/${rfq.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {rfq.title}
                      </Link>
                    </td>
                    <td className="p-4 text-center tabular-nums">{rfqItemCounts[rfq.id] ?? 0}</td>
                    <td className="p-4 text-center tabular-nums">{quoteCounts[rfq.id] ?? 0}</td>
                    <td className="p-4 text-center"><StatusBadge status={rfq.status} /></td>
                    <td className="p-4 text-xs text-muted-foreground">{formatDate(rfq.created_at)}</td>
                    <td className="p-4 text-xs text-muted-foreground">{formatDate(rfq.needed_by)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(nextOpen) => {
            setDialogOpen(nextOpen);
            if (!nextOpen) {
              setForm(createInitialForm());
              clearStoredDraft();
            }
          }}
        >
          <DialogContent
            className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0"
            onInteractOutside={(event) => event.preventDefault()}
          >
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle>Новый запрос на закупку</DialogTitle>
              <DialogDescription>
                Создайте запрос, добавьте позиции и пригласите поставщиков.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Название</Label>
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Нужно к</Label>
                <Input type="date" value={form.neededBy} onChange={(event) => setForm((current) => ({ ...current, neededBy: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Адрес доставки</Label>
                <Input value={form.deliveryAddress} onChange={(event) => setForm((current) => ({ ...current, deliveryAddress: event.target.value }))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Описание</Label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Позиции</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      items: [...current.items, createItem(current.items.length + 1)],
                    }))
                  }
                >
                  Добавить позицию
                </Button>
              </div>

              <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1">
                {form.items.map((item, index) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Позиция {index + 1}</p>
                      {form.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              items: current.items.filter((entry) => entry.id !== item.id),
                            }))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-2 md:grid-cols-12">
                      <div className="space-y-1 md:col-span-5">
                        <Label className="text-xs">Материал</Label>
                        <select
                          value={item.materialId}
                          onChange={(event) => {
                            const selectedMaterial = materials.find((material) => material.id === event.target.value);
                            updateItem(item.id, 'materialId', event.target.value);
                            if (selectedMaterial?.unit) {
                              updateItem(item.id, 'unit', selectedMaterial.unit);
                            }
                          }}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Выберите материал</option>
                          {materials.map((material) => (
                            <option key={material.id} value={material.id}>
                              {material.name}{material.sku ? ` · ${material.sku}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs">Количество</Label>
                        <Input value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs">Ед. изм.</Label>
                        <Input value={item.unit} onChange={(event) => updateItem(item.id, 'unit', event.target.value)} />
                      </div>
                      <div className="space-y-1 md:col-span-3">
                        <Label className="text-xs">Комментарий</Label>
                        <Input value={item.comment} onChange={(event) => updateItem(item.id, 'comment', event.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Пригласить поставщиков</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Выбрано {form.supplierIds.length} из {supplierCandidates.length}. Можно искать по названию компании.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={supplierCandidates.length === 0}
                    onClick={() => selectSuppliers(supplierCandidates.map((supplier) => supplier.id))}
                  >
                    Выбрать всех
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={visibleSupplierCandidates.length === 0}
                    onClick={() => selectSuppliers(visibleSupplierIds)}
                  >
                    Выбрать найденных
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={form.supplierIds.length === 0}
                    onClick={() => clearSuppliers()}
                  >
                    Снять выделение
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={supplierSearch}
                  onChange={(event) => setSupplierSearch(event.target.value)}
                  placeholder="Найти поставщика по названию..."
                  className="h-9 pl-9 text-sm"
                />
              </div>

              <div className="grid max-h-44 gap-2 overflow-auto rounded-lg border bg-background p-2 md:grid-cols-2">
                {supplierCandidates.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">Нет доступных поставщиков с активными предложениями.</p>
                ) : visibleSupplierCandidates.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">По такому запросу поставщиков не найдено.</p>
                ) : (
                  visibleSupplierCandidates.map((supplier) => {
                    const checked = form.supplierIds.includes(supplier.id);

                    return (
                      <label
                        key={supplier.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                          checked ? 'border-primary/40 bg-primary/5 text-foreground' : 'hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSupplier(supplier.id)}
                        />
                        <span className="min-w-0 flex-1 truncate">{supplier.name}</span>
                      </label>
                    );
                  })
                )}
              </div>

              {visibleSupplierCandidates.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Показано {visibleSupplierCandidates.length}</span>
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground"
                    disabled={selectedVisibleCount === 0}
                    onClick={() => clearSuppliers(visibleSupplierIds)}
                  >
                    Снять выделение с найденных ({selectedVisibleCount})
                  </button>
                </div>
              )}
            </div>

            </div>

            <DialogFooter className="border-t bg-card px-6 py-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Создание…' : 'Создать запрос'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
