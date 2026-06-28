drop policy if exists "Buyers can confirm receipt for own shipments" on public.shipments;
create policy "Buyers can confirm receipt for own shipments"
  on public.shipments for update
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = shipments.order_id
        and public.is_company_member(o.buyer_company_id)
    )
  )
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = shipments.order_id
        and public.is_company_member(o.buyer_company_id)
    )
  );
