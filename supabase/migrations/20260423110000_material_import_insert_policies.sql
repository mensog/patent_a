drop policy if exists "Suppliers can insert material categories for import" on public.material_categories;
create policy "Suppliers can insert material categories for import"
  on public.material_categories for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('supplier', 'manager', 'admin')
    )
  );

drop policy if exists "Suppliers can insert materials for import" on public.materials;
create policy "Suppliers can insert materials for import"
  on public.materials for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('supplier', 'manager', 'admin')
    )
  );
