drop policy if exists "Authenticated users can view demo profile directory" on public.profiles;
create policy "Authenticated users can view demo profile directory"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Invited suppliers can update demo rfq status" on public.rfqs;
create policy "Invited suppliers can update demo rfq status"
  on public.rfqs for update
  to authenticated
  using (
    exists (
      select 1
      from public.rfq_suppliers rs
      where rs.rfq_id = rfqs.id
        and rs.supplier_company_id = public.get_my_company_id()
    )
  )
  with check (
    exists (
      select 1
      from public.rfq_suppliers rs
      where rs.rfq_id = rfqs.id
        and rs.supplier_company_id = public.get_my_company_id()
    )
  );

drop policy if exists "Suppliers can update own demo order lifecycle" on public.orders;
create policy "Suppliers can update own demo order lifecycle"
  on public.orders for update
  to authenticated
  using (supplier_company_id = public.get_my_company_id())
  with check (supplier_company_id = public.get_my_company_id());

drop policy if exists "Buyers can update own demo orders" on public.orders;
create policy "Buyers can update own demo orders"
  on public.orders for update
  to authenticated
  using (buyer_company_id = public.get_my_company_id())
  with check (buyer_company_id = public.get_my_company_id());
