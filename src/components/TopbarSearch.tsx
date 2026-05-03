import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { normalizeText } from '@/lib/app-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SearchResultItem, SupplierOfferWithMaterial } from '@/types/app';

export function TopbarSearch() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = normalizeText(deferredSearch);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['topbar-search', profile?.role, companyId, normalizedSearch],
    queryFn: async () => {
      if (!profile || !companyId || normalizedSearch.length < 2) {
        return [];
      }

      const queryText = `%${normalizedSearch}%`;
      const collected: SearchResultItem[] = [];

      if (profile.role === 'supplier') {
        const { data: invites } = await supabase
          .from('rfq_suppliers')
          .select('rfq_id')
          .eq('supplier_company_id', companyId);

        if (invites?.length) {
          const { data: rfqs } = await supabase
            .from('rfqs')
            .select('id, title')
            .in('id', invites.map((item) => item.rfq_id))
            .ilike('title', queryText)
            .limit(5);

          rfqs?.forEach((rfq) => {
            collected.push({
              id: `rfq-${rfq.id}`,
              label: rfq.title,
              description: 'RFQ',
              href: `/supplier/rfq/${rfq.id}`,
              group: 'RFQ',
            });
          });
        }

        const { data: shipments } = await supabase
          .from('shipments')
          .select('id, shipment_number')
          .eq('supplier_company_id', companyId)
          .ilike('shipment_number', queryText)
          .limit(5);

        shipments?.forEach((shipment) => {
          collected.push({
            id: `shipment-${shipment.id}`,
            label: shipment.shipment_number ?? shipment.id.slice(0, 8),
            description: 'Отгрузка',
            href: `/supplier/shipments/${shipment.id}`,
            group: 'Отгрузки',
          });
        });

        const { data: offers } = await supabase
          .from('supplier_offers')
          .select('id, material_id, materials!supplier_offers_material_id_fkey(name)')
          .eq('supplier_company_id', companyId)
          .limit(10);

        (offers as SupplierOfferWithMaterial[] | null)?.forEach((offer) => {
          const materialName = offer.materials?.name ?? '';
          if (normalizeText(materialName).includes(normalizedSearch)) {
            collected.push({
              id: `offer-${offer.id}`,
              label: materialName,
              description: 'Ваше предложение',
              href: '/supplier/offers',
              group: 'Предложения',
            });
          }
        });
      } else {
        const { data: materials } = await supabase
          .from('materials')
          .select('id, name, sku')
          .or(`name.ilike.${queryText},sku.ilike.${queryText}`)
          .order('name')
          .limit(5);

        materials?.forEach((material) => {
          collected.push({
            id: `material-${material.id}`,
            label: material.name,
            description: material.sku ? `Материал · ${material.sku}` : 'Материал',
            href: `/buyer/material/${material.id}`,
            group: 'Материалы',
          });
        });

        const { data: rfqs } = await supabase
          .from('rfqs')
          .select('id, title')
          .eq('buyer_company_id', companyId)
          .ilike('title', queryText)
          .limit(5);

        rfqs?.forEach((rfq) => {
          collected.push({
            id: `rfq-${rfq.id}`,
            label: rfq.title,
            description: 'RFQ',
            href: `/buyer/rfq/${rfq.id}`,
            group: 'RFQ',
          });
        });

        const { data: orders } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('buyer_company_id', companyId)
          .ilike('order_number', queryText)
          .limit(5);

        orders?.forEach((order) => {
          collected.push({
            id: `order-${order.id}`,
            label: order.order_number ? `Заказ #${order.order_number}` : order.id.slice(0, 8),
            description: 'Заказ',
            href: `/buyer/orders/${order.id}`,
            group: 'Заказы',
          });
        });

        const { data: shipments } = await supabase
          .from('shipments')
          .select('id, shipment_number, orders!inner(buyer_company_id)')
          .eq('orders.buyer_company_id', companyId)
          .ilike('shipment_number', queryText)
          .limit(5);

        shipments?.forEach((shipment) => {
          collected.push({
            id: `buyer-shipment-${shipment.id}`,
            label: shipment.shipment_number ?? shipment.id.slice(0, 8),
            description: 'Отгрузка',
            href: `/buyer/shipments/${shipment.id}`,
            group: 'Отгрузки',
          });
        });
      }

      return collected.slice(0, 12);
    },
    enabled: open && normalizedSearch.length >= 2,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center rounded-md border bg-background px-3 py-1.5">
          <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            placeholder="Поиск материалов, RFQ, заказов, отгрузок..."
            className="w-56 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onFocus={() => setOpen(true)}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[420px] p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Глобальный поиск</p>
          <p className="text-xs text-muted-foreground">
            {normalizedSearch.length < 2 ? 'Введите минимум 2 символа' : `${results.length} результатов`}
          </p>
        </div>

        <ScrollArea className="h-[320px]">
          <div className="p-2">
            {normalizedSearch.length < 2 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Начните вводить запрос</p>
            ) : isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Ищу совпадения…</p>
            ) : results.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Совпадений не найдено</p>
            ) : (
              results.map((result) => (
                <Link
                  key={result.id}
                  to={result.href}
                  className="block rounded-lg border px-3 py-3 transition-colors hover:bg-muted/40"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{result.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{result.description}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {result.group}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
