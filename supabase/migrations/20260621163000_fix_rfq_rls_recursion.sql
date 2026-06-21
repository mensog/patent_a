create or replace function public.is_company_member(_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = _company_id
      and p.is_active = true
  );
$$;

create or replace function public.is_rfq_buyer(_rfq_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rfqs r
    where r.id = _rfq_id
      and public.is_company_member(r.buyer_company_id)
  );
$$;

create or replace function public.is_invited_supplier_to_rfq(_rfq_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rfq_suppliers rs
    where rs.rfq_id = _rfq_id
      and public.is_company_member(rs.supplier_company_id)
  );
$$;

create or replace function public.can_access_rfq(_rfq_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_rfq_buyer(_rfq_id)
    or public.is_invited_supplier_to_rfq(_rfq_id);
$$;

create or replace function public.is_quote_supplier(_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quotes q
    where q.id = _quote_id
      and public.is_company_member(q.supplier_company_id)
  );
$$;

create or replace function public.can_access_quote(_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quotes q
    where q.id = _quote_id
      and (
        public.is_company_member(q.supplier_company_id)
        or public.is_rfq_buyer(q.rfq_id)
      )
  );
$$;

create or replace function public.can_access_order(_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = _order_id
      and (
        public.is_company_member(o.buyer_company_id)
        or public.is_company_member(o.supplier_company_id)
      )
  );
$$;

grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_rfq_buyer(uuid) to authenticated;
grant execute on function public.is_invited_supplier_to_rfq(uuid) to authenticated;
grant execute on function public.can_access_rfq(uuid) to authenticated;
grant execute on function public.is_quote_supplier(uuid) to authenticated;
grant execute on function public.can_access_quote(uuid) to authenticated;
grant execute on function public.can_access_order(uuid) to authenticated;

drop policy if exists "Users can view accessible rfqs" on public.rfqs;
drop policy if exists "Buyers can insert own rfqs" on public.rfqs;
drop policy if exists "Buyers can update own rfqs" on public.rfqs;
drop policy if exists "Invited suppliers can update demo rfq status" on public.rfqs;
create policy "Users can view accessible rfqs"
  on public.rfqs for select
  to authenticated
  using (
    public.is_company_member(buyer_company_id)
    or public.is_invited_supplier_to_rfq(id)
  );
create policy "Buyers can insert own rfqs"
  on public.rfqs for insert
  to authenticated
  with check (
    public.is_company_member(buyer_company_id)
    and created_by = auth.uid()
  );
create policy "Buyers can update own rfqs"
  on public.rfqs for update
  to authenticated
  using (public.is_company_member(buyer_company_id))
  with check (public.is_company_member(buyer_company_id));
create policy "Invited suppliers can update rfq status"
  on public.rfqs for update
  to authenticated
  using (public.is_invited_supplier_to_rfq(id))
  with check (public.is_invited_supplier_to_rfq(id));

drop policy if exists "Users can view accessible rfq suppliers" on public.rfq_suppliers;
drop policy if exists "Buyers can insert rfq suppliers" on public.rfq_suppliers;
create policy "Users can view accessible rfq suppliers"
  on public.rfq_suppliers for select
  to authenticated
  using (
    public.is_company_member(supplier_company_id)
    or public.is_rfq_buyer(rfq_id)
  );
create policy "Buyers can insert rfq suppliers"
  on public.rfq_suppliers for insert
  to authenticated
  with check (public.is_rfq_buyer(rfq_id));

drop policy if exists "Users can view accessible rfq items" on public.rfq_items;
drop policy if exists "Buyers can insert rfq items" on public.rfq_items;
drop policy if exists "Buyers can update rfq items" on public.rfq_items;
drop policy if exists "Buyers can delete rfq items" on public.rfq_items;
create policy "Users can view accessible rfq items"
  on public.rfq_items for select
  to authenticated
  using (public.can_access_rfq(rfq_id));
create policy "Buyers can insert rfq items"
  on public.rfq_items for insert
  to authenticated
  with check (public.is_rfq_buyer(rfq_id));
create policy "Buyers can update rfq items"
  on public.rfq_items for update
  to authenticated
  using (public.is_rfq_buyer(rfq_id))
  with check (public.is_rfq_buyer(rfq_id));
create policy "Buyers can delete rfq items"
  on public.rfq_items for delete
  to authenticated
  using (public.is_rfq_buyer(rfq_id));

drop policy if exists "Users can view accessible quotes" on public.quotes;
drop policy if exists "Suppliers can insert own quotes" on public.quotes;
drop policy if exists "Suppliers can update own quotes" on public.quotes;
drop policy if exists "Buyers can update quotes for own rfqs" on public.quotes;
create policy "Users can view accessible quotes"
  on public.quotes for select
  to authenticated
  using (
    public.is_company_member(supplier_company_id)
    or public.is_rfq_buyer(rfq_id)
  );
create policy "Suppliers can insert own quotes"
  on public.quotes for insert
  to authenticated
  with check (
    public.is_company_member(supplier_company_id)
    and public.is_invited_supplier_to_rfq(rfq_id)
  );
create policy "Suppliers can update own quotes"
  on public.quotes for update
  to authenticated
  using (public.is_company_member(supplier_company_id))
  with check (public.is_company_member(supplier_company_id));
create policy "Buyers can update quotes for own rfqs"
  on public.quotes for update
  to authenticated
  using (public.is_rfq_buyer(rfq_id))
  with check (public.is_rfq_buyer(rfq_id));
