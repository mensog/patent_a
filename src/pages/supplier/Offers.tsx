import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, normalizeText } from '@/lib/app-utils';
import type { MaterialPreview, SupplierOfferWithMaterial } from '@/types/app';

interface OfferFormState {
  id: string | null;
  article: string;
  materialId: string;
  price: string;
  stock: string;
  minVolume: string;
  leadTimeDays: string;
  vatRate: string;
  deliveryCost: string;
  isActive: boolean;
}

const emptyForm: OfferFormState = {
  id: null,
  article: '',
  materialId: '',
  price: '',
  stock: '',
  minVolume: '',
  leadTimeDays: '',
  vatRate: '20',
  deliveryCost: '',
  isActive: true,
};

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function Offers() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<OfferFormState>(emptyForm);

  const { data: offers = [], isLoading, error } = useQuery({
    queryKey: ['supplier-all-offers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error: queryError } = await supabase
        .from('supplier_offers')
        .select('*, materials!supplier_offers_material_id_fkey(name)')
        .eq('supplier_company_id', companyId)
        .order('updated_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      return (data ?? []) as SupplierOfferWithMaterial[];
    },
    enabled: !!companyId,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials-for-offers'],
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

  const filtered = offers.filter((offer) => {
    const name = offer.materials?.name ?? '';
    const searchText = normalizeText(search);
    const matchSearch = !searchText || normalizeText(name).includes(searchText);
    const matchFilter = filter === 'all' || (filter === 'active' ? offer.is_active : !offer.is_active);
    return matchSearch && matchFilter;
  });

  const activeCount = offers.filter((offer) => offer.is_active).length;

  const invalidateOfferQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['supplier-all-offers', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['supplier-offers-summary', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['material-offers'] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (nextForm: OfferFormState) => {
      if (!companyId) {
        throw new Error('Компания пользователя не определена.');
      }

      if (!nextForm.materialId) {
        throw new Error('Выберите материал.');
      }

      const payload = {
        article: nextForm.article.trim() || null,
        currency: 'RUB',
        delivery_cost: toOptionalNumber(nextForm.deliveryCost),
        is_active: nextForm.isActive,
        lead_time_days: toOptionalNumber(nextForm.leadTimeDays),
        material_id: nextForm.materialId,
        min_volume: toOptionalNumber(nextForm.minVolume),
        price: Number(nextForm.price),
        stock: toOptionalNumber(nextForm.stock),
        supplier_company_id: companyId,
        vat_rate: Number(nextForm.vatRate || '20'),
      };

      if (!Number.isFinite(payload.price) || payload.price <= 0) {
        throw new Error('Цена должна быть положительным числом.');
      }

      if (nextForm.id) {
        const { error: updateError } = await supabase
          .from('supplier_offers')
          .update(payload)
          .eq('id', nextForm.id)
          .eq('supplier_company_id', companyId);

        if (updateError) {
          throw updateError;
        }

        return;
      }

      const { error: insertError } = await supabase.from('supplier_offers').insert(payload);

      if (insertError) {
        throw insertError;
      }
    },
    onSuccess: async () => {
      await invalidateOfferQueries();
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: 'Предложение сохранено' });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Не удалось сохранить предложение',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (offerId: string) => {
      if (!companyId) {
        throw new Error('Компания пользователя не определена.');
      }

      const { error: deleteError } = await supabase
        .from('supplier_offers')
        .delete()
        .eq('id', offerId)
        .eq('supplier_company_id', companyId);

      if (deleteError) {
        throw deleteError;
      }
    },
    onSuccess: async () => {
      await invalidateOfferQueries();
      setDeleteId(null);
      toast({ title: 'Предложение удалено' });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Не удалось удалить предложение',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const openCreateDialog = () => {
    setForm({
      ...emptyForm,
      materialId: materials[0]?.id ?? '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (offer: SupplierOfferWithMaterial) => {
    setForm({
      id: offer.id,
      article: offer.article ?? '',
      materialId: offer.material_id,
      price: String(offer.price),
      stock: offer.stock !== null ? String(offer.stock) : '',
      minVolume: offer.min_volume !== null ? String(offer.min_volume) : '',
      leadTimeDays: offer.lead_time_days !== null ? String(offer.lead_time_days) : '',
      vatRate: String(offer.vat_rate),
      deliveryCost: offer.delivery_cost !== null ? String(offer.delivery_cost) : '',
      isActive: offer.is_active,
    });
    setDialogOpen(true);
  };

  const selectedOffer = deleteId ? offers.find((offer) => offer.id === deleteId) ?? null : null;

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Управление предложениями</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{offers.length} позиций · {activeCount} активных</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2 text-xs h-8" onClick={openCreateDialog}>
              <Plus className="h-3.5 w-3.5" /> Добавить позицию
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Всего позиций</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{offers.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Активных</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-success">{activeCount}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Средняя цена</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">
              {offers.length > 0
                ? formatCurrency(Math.round(offers.reduce((sum, offer) => sum + Number(offer.price), 0) / offers.length))
                : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border bg-card px-3 py-2 flex-1 max-w-sm">
            <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по наименованию..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {(['all', 'active', 'inactive'] as const).map((nextFilter) => (
            <button
              key={nextFilter}
              onClick={() => setFilter(nextFilter)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === nextFilter
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {nextFilter === 'all'
                ? `Все (${offers.length})`
                : nextFilter === 'active'
                  ? `Активные (${activeCount})`
                  : `Неактивные (${offers.length - activeCount})`}
            </button>
          ))}
        </div>

        <div className="card-panel">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : error ? (
            <p className="py-16 text-center text-sm text-destructive">Не удалось загрузить предложения.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="table-header px-5 py-3 text-left">Наименование</th>
                    <th className="table-header px-5 py-3 text-right">Цена</th>
                    <th className="table-header px-5 py-3 text-right">Остаток</th>
                    <th className="table-header px-5 py-3 text-right">Мин. объём</th>
                    <th className="table-header px-5 py-3 text-right">Срок, дн.</th>
                    <th className="table-header px-5 py-3 text-center">Статус</th>
                    <th className="table-header px-5 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((offer) => (
                    <tr key={offer.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors group">
                      <td className="px-5 py-3.5 font-medium">{offer.materials?.name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{formatCurrency(offer.price)}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{offer.stock ?? 0}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{offer.min_volume ?? '—'}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{offer.lead_time_days ?? '—'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${offer.is_active ? 'bg-success/8 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${offer.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
                          {offer.is_active ? 'Активна' : 'Нет'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditDialog(offer)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(offer.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-16 text-center">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground">Позиции не найдены</p>
                  <p className="mt-1 text-xs text-muted-foreground">Измените параметры фильтрации</p>
                </div>
              )}
            </>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? 'Редактирование предложения' : 'Новое предложение'}</DialogTitle>
              <DialogDescription>
                Заполните ключевые параметры позиции. Изменения сразу попадут в каталог поставщиков.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Материал</Label>
                <select
                  value={form.materialId}
                  onChange={(event) => setForm((current) => ({ ...current, materialId: event.target.value }))}
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
                <Label className="text-xs">Цена, ₽</Label>
                <Input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Артикул</Label>
                <Input value={form.article} onChange={(event) => setForm((current) => ({ ...current, article: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Остаток</Label>
                <Input value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Мин. объём</Label>
                <Input value={form.minVolume} onChange={(event) => setForm((current) => ({ ...current, minVolume: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Срок поставки, дн.</Label>
                <Input value={form.leadTimeDays} onChange={(event) => setForm((current) => ({ ...current, leadTimeDays: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">НДС, %</Label>
                <Input value={form.vatRate} onChange={(event) => setForm((current) => ({ ...current, vatRate: event.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Доставка, ₽</Label>
                <Input value={form.deliveryCost} onChange={(event) => setForm((current) => ({ ...current, deliveryCost: event.target.value }))} />
              </div>

              <label className="sm:col-span-2 flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Позиция активна и видна покупателям
              </label>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Сохранение…' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={(nextOpen) => !nextOpen && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить предложение?</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedOffer?.materials?.name ?? 'Эта позиция'} будет удалена из каталога поставщика.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              >
                {deleteMutation.isPending ? 'Удаление…' : 'Удалить'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
