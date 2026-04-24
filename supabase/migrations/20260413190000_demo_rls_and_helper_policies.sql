create or replace function public.get_my_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.can_access_rfq(_rfq_id uuid)
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
      and r.buyer_company_id = public.get_my_company_id()
  )
  or exists (
    select 1
    from public.rfq_suppliers rs
    where rs.rfq_id = _rfq_id
      and rs.supplier_company_id = public.get_my_company_id()
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
    join public.rfqs r on r.id = q.rfq_id
    where q.id = _quote_id
      and (
        q.supplier_company_id = public.get_my_company_id()
        or r.buyer_company_id = public.get_my_company_id()
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
        o.buyer_company_id = public.get_my_company_id()
        or o.supplier_company_id = public.get_my_company_id()
      )
  );
$$;

grant execute on function public.get_my_company_id() to authenticated;
grant execute on function public.can_access_rfq(uuid) to authenticated;
grant execute on function public.can_access_quote(uuid) to authenticated;
grant execute on function public.can_access_order(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.material_categories enable row level security;
alter table public.materials enable row level security;
alter table public.supplier_offers enable row level security;
alter table public.rfqs enable row level security;
alter table public.rfq_items enable row level security;
alter table public.rfq_suppliers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_items enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Authenticated users can create companies" on public.companies;
drop policy if exists "Authenticated users can view companies" on public.companies;
drop policy if exists "Users can update own company" on public.companies;
drop policy if exists "Users can view own company" on public.companies;
create policy "Authenticated users can create companies"
  on public.companies for insert
  to authenticated
  with check (true);
create policy "Authenticated users can view companies"
  on public.companies for select
  to authenticated
  using (true);
create policy "Users can update own company"
  on public.companies for update
  to authenticated
  using (id = public.get_my_company_id());

drop policy if exists "Authenticated users can view material categories" on public.material_categories;
create policy "Authenticated users can view material categories"
  on public.material_categories for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can view materials" on public.materials;
create policy "Authenticated users can view materials"
  on public.materials for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can view offers" on public.supplier_offers;
drop policy if exists "Suppliers can insert own offers" on public.supplier_offers;
drop policy if exists "Suppliers can update own offers" on public.supplier_offers;
drop policy if exists "Suppliers can delete own offers" on public.supplier_offers;
create policy "Authenticated users can view offers"
  on public.supplier_offers for select
  to authenticated
  using (is_active = true or supplier_company_id = public.get_my_company_id());
create policy "Suppliers can insert own offers"
  on public.supplier_offers for insert
  to authenticated
  with check (supplier_company_id = public.get_my_company_id());
create policy "Suppliers can update own offers"
  on public.supplier_offers for update
  to authenticated
  using (supplier_company_id = public.get_my_company_id());
create policy "Suppliers can delete own offers"
  on public.supplier_offers for delete
  to authenticated
  using (supplier_company_id = public.get_my_company_id());

drop policy if exists "Users can view accessible rfqs" on public.rfqs;
drop policy if exists "Buyers can insert own rfqs" on public.rfqs;
drop policy if exists "Buyers can update own rfqs" on public.rfqs;
create policy "Users can view accessible rfqs"
  on public.rfqs for select
  to authenticated
  using (
    buyer_company_id = public.get_my_company_id()
    or exists (
      select 1
      from public.rfq_suppliers rs
      where rs.rfq_id = rfqs.id
        and rs.supplier_company_id = public.get_my_company_id()
    )
  );
create policy "Buyers can insert own rfqs"
  on public.rfqs for insert
  to authenticated
  with check (
    buyer_company_id = public.get_my_company_id()
    and created_by = auth.uid()
  );
create policy "Buyers can update own rfqs"
  on public.rfqs for update
  to authenticated
  using (buyer_company_id = public.get_my_company_id());

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
  with check (
    exists (
      select 1
      from public.rfqs r
      where r.id = rfq_items.rfq_id
        and r.buyer_company_id = public.get_my_company_id()
    )
  );
create policy "Buyers can update rfq items"
  on public.rfq_items for update
  to authenticated
  using (
    exists (
      select 1
      from public.rfqs r
      where r.id = rfq_items.rfq_id
        and r.buyer_company_id = public.get_my_company_id()
    )
  );
create policy "Buyers can delete rfq items"
  on public.rfq_items for delete
  to authenticated
  using (
    exists (
      select 1
      from public.rfqs r
      where r.id = rfq_items.rfq_id
        and r.buyer_company_id = public.get_my_company_id()
    )
  );

drop policy if exists "Users can view accessible rfq suppliers" on public.rfq_suppliers;
drop policy if exists "Buyers can insert rfq suppliers" on public.rfq_suppliers;
create policy "Users can view accessible rfq suppliers"
  on public.rfq_suppliers for select
  to authenticated
  using (
    supplier_company_id = public.get_my_company_id()
    or exists (
      select 1
      from public.rfqs r
      where r.id = rfq_suppliers.rfq_id
        and r.buyer_company_id = public.get_my_company_id()
    )
  );
create policy "Buyers can insert rfq suppliers"
  on public.rfq_suppliers for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.rfqs r
      where r.id = rfq_suppliers.rfq_id
        and r.buyer_company_id = public.get_my_company_id()
    )
  );

drop policy if exists "Users can view accessible quotes" on public.quotes;
drop policy if exists "Suppliers can insert own quotes" on public.quotes;
drop policy if exists "Suppliers can update own quotes" on public.quotes;
create policy "Users can view accessible quotes"
  on public.quotes for select
  to authenticated
  using (public.can_access_quote(id));
create policy "Suppliers can insert own quotes"
  on public.quotes for insert
  to authenticated
  with check (
    supplier_company_id = public.get_my_company_id()
    and public.can_access_rfq(rfq_id)
  );
create policy "Suppliers can update own quotes"
  on public.quotes for update
  to authenticated
  using (supplier_company_id = public.get_my_company_id());

drop policy if exists "Users can view accessible quote items" on public.quote_items;
drop policy if exists "Suppliers can insert own quote items" on public.quote_items;
drop policy if exists "Suppliers can update own quote items" on public.quote_items;
drop policy if exists "Suppliers can delete own quote items" on public.quote_items;
create policy "Users can view accessible quote items"
  on public.quote_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.quotes q
      where q.id = quote_items.quote_id
        and public.can_access_quote(q.id)
    )
  );
create policy "Suppliers can insert own quote items"
  on public.quote_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.quotes q
      where q.id = quote_items.quote_id
        and q.supplier_company_id = public.get_my_company_id()
    )
  );
create policy "Suppliers can update own quote items"
  on public.quote_items for update
  to authenticated
  using (
    exists (
      select 1
      from public.quotes q
      where q.id = quote_items.quote_id
        and q.supplier_company_id = public.get_my_company_id()
    )
  );
create policy "Suppliers can delete own quote items"
  on public.quote_items for delete
  to authenticated
  using (
    exists (
      select 1
      from public.quotes q
      where q.id = quote_items.quote_id
        and q.supplier_company_id = public.get_my_company_id()
    )
  );

drop policy if exists "Users can view accessible orders" on public.orders;
create policy "Users can view accessible orders"
  on public.orders for select
  to authenticated
  using (public.can_access_order(id));

drop policy if exists "Users can view accessible order items" on public.order_items;
create policy "Users can view accessible order items"
  on public.order_items for select
  to authenticated
  using (public.can_access_order(order_id));

drop policy if exists "Users can view accessible shipments" on public.shipments;
drop policy if exists "Suppliers can update own shipments" on public.shipments;
create policy "Users can view accessible shipments"
  on public.shipments for select
  to authenticated
  using (
    supplier_company_id = public.get_my_company_id()
    or exists (
      select 1
      from public.orders o
      where o.id = shipments.order_id
        and o.buyer_company_id = public.get_my_company_id()
    )
  );
create policy "Suppliers can update own shipments"
  on public.shipments for update
  to authenticated
  using (supplier_company_id = public.get_my_company_id());

drop policy if exists "Users can view accessible shipment items" on public.shipment_items;
create policy "Users can view accessible shipment items"
  on public.shipment_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.shipments s
      where s.id = shipment_items.shipment_id
        and (
          s.supplier_company_id = public.get_my_company_id()
          or exists (
            select 1
            from public.orders o
            where o.id = s.order_id
              and o.buyer_company_id = public.get_my_company_id()
          )
        )
    )
  );

drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());
create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());
