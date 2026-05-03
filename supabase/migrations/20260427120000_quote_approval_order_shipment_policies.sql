drop policy if exists "Buyers can update quotes for own rfqs" on public.quotes;
create policy "Buyers can update quotes for own rfqs"
  on public.quotes for update
  to authenticated
  using (
    exists (
      select 1
      from public.rfqs r
      where r.id = quotes.rfq_id
        and r.buyer_company_id = public.get_my_company_id()
    )
  )
  with check (
    exists (
      select 1
      from public.rfqs r
      where r.id = quotes.rfq_id
        and r.buyer_company_id = public.get_my_company_id()
    )
  );

drop policy if exists "Buyers can insert own orders" on public.orders;
create policy "Buyers can insert own orders"
  on public.orders for insert
  to authenticated
  with check (
    buyer_company_id = public.get_my_company_id()
    and created_by = auth.uid()
    and exists (
      select 1
      from public.quotes q
      join public.rfqs r on r.id = q.rfq_id
      where q.id = orders.quote_id
        and r.buyer_company_id = public.get_my_company_id()
    )
  );

drop policy if exists "Buyers can insert own order items" on public.order_items;
create policy "Buyers can insert own order items"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.buyer_company_id = public.get_my_company_id()
    )
  );

drop policy if exists "Suppliers can insert own shipments" on public.shipments;
create policy "Suppliers can insert own shipments"
  on public.shipments for insert
  to authenticated
  with check (
    supplier_company_id = public.get_my_company_id()
    and exists (
      select 1
      from public.orders o
      where o.id = shipments.order_id
        and o.supplier_company_id = public.get_my_company_id()
    )
  );

drop policy if exists "Suppliers can insert own shipment items" on public.shipment_items;
create policy "Suppliers can insert own shipment items"
  on public.shipment_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.shipments s
      where s.id = shipment_items.shipment_id
        and s.supplier_company_id = public.get_my_company_id()
    )
  );

drop policy if exists "Authenticated users can insert notifications" on public.notifications;
create policy "Authenticated users can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (user_id is not null);
