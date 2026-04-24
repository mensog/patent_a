import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/app-utils';
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

const initialForm: RfqFormState = {
  title: '',
  description: '',
  deliveryAddress: '',
  neededBy: '',
  items: [createItem(1)],
  supplierIds: [],
};

export default function RfqList() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RfqFormState>(initialForm);

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

  const createMutation = useMutation({
    mutationFn: async (payload: RfqFormState) => {
      if (!companyId || !user?.id) {
        throw new Error('Профиль пользователя не готов к созданию RFQ.');
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
        throw rfqError ?? new Error('Не удалось создать RFQ.');
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
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['buyer-all-rfqs', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['buyer-rfqs', companyId] }),
      ]);
      setDialogOpen(false);
      setForm(initialForm);
      toast({ title: 'RFQ создан' });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Не удалось создать RFQ',
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

  const openDialog = () => {
    setForm({
      ...initialForm,
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Запросы на КП (RFQ)</h1>
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
            <p className="py-16 text-center text-sm text-destructive">Не удалось загрузить RFQ.</p>
          ) : rfqs.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Нет запросов</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="table-header p-4 text-left">Запрос</th>
                  <th className="table-header p-4 text-center">Статус</th>
                  <th className="table-header p-4 text-left">Создан</th>
                  <th className="table-header p-4 text-left">Дедлайн</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => (
                  <tr key={rfq.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="p-4">
                      <Link
                        to={`/buyer/rfq/${rfq.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {rfq.title}
                      </Link>
                    </td>
                    <td className="p-4 text-center"><StatusBadge status={rfq.status} /></td>
                    <td className="p-4 text-xs text-muted-foreground">{formatDate(rfq.created_at)}</td>
                    <td className="p-4 text-xs text-muted-foreground">{formatDate(rfq.needed_by)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Новый RFQ</DialogTitle>
              <DialogDescription>
                Создайте demo-запрос, добавьте позиции и пригласите поставщиков.
              </DialogDescription>
            </DialogHeader>

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

              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={item.id} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Позиция {index + 1}</p>
                      {form.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive hover:text-destructive"
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
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-1.5 md:col-span-2">
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
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Выберите материал</option>
                          {materials.map((material) => (
                            <option key={material.id} value={material.id}>
                              {material.name}{material.sku ? ` · ${material.sku}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Количество</Label>
                        <Input value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Ед. изм.</Label>
                        <Input value={item.unit} onChange={(event) => updateItem(item.id, 'unit', event.target.value)} />
                      </div>
                      <div className="space-y-1.5 md:col-span-4">
                        <Label className="text-xs">Комментарий</Label>
                        <Input value={item.comment} onChange={(event) => updateItem(item.id, 'comment', event.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Пригласить поставщиков</h3>
              <div className="grid max-h-48 gap-2 overflow-auto rounded-lg border p-3 md:grid-cols-2">
                {supplierCandidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет доступных поставщиков с активными предложениями.</p>
                ) : (
                  supplierCandidates.map((supplier) => (
                    <label key={supplier.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.supplierIds.includes(supplier.id)}
                        onChange={() => toggleSupplier(supplier.id)}
                      />
                      {supplier.name}
                    </label>
                  ))
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Создание…' : 'Создать RFQ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
