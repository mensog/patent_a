-- Allows buyer to accept a supplier quote and create an order from it.
-- This replaces the older insert policy that depended on get_my_company_id()
-- and could fail after the RLS helper-policy refactor.

drop policy if exists "Buyers can insert own orders" on public.orders;
drop policy if exists "Buyers can create orders from own accepted quote" on public.orders;
create policy "Buyers can create orders from own accepted quote"
  on public.orders for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_company_member(buyer_company_id)
    and exists (
      select 1
      from public.quotes q
      where q.id = orders.quote_id
        and q.rfq_id = orders.rfq_id
        and q.supplier_company_id = orders.supplier_company_id
        and public.is_rfq_buyer(q.rfq_id)
    )
  );

drop policy if exists "Buyers can insert own order items" on public.order_items;
drop policy if exists "Buyers can insert items for own new orders" on public.order_items;
create policy "Buyers can insert items for own new orders"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and public.is_company_member(o.buyer_company_id)
    )
  );

-- Keep buyer-side order lifecycle/payment updates available for the demo flow.
drop policy if exists "Buyers can update own demo orders" on public.orders;
drop policy if exists "Buyers can update own orders" on public.orders;
create policy "Buyers can update own orders"
  on public.orders for update
  to authenticated
  using (public.is_company_member(buyer_company_id))
  with check (public.is_company_member(buyer_company_id));
