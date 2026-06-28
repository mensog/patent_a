-- Demo-safe RPC helpers for cross-company notifications and quote acceptance.
-- They keep RLS enabled for tables, while allowing controlled business actions.

create or replace function public.notify_users(
  _user_ids uuid[],
  _type public.notification_type,
  _title text,
  _body text default null,
  _related_entity_id uuid default null,
  _related_entity_type text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.notifications (user_id, type, title, body, related_entity_id, related_entity_type)
  select distinct user_id, coalesce(_type, 'system'::public.notification_type), _title, _body, _related_entity_id, coalesce(_related_entity_type, _type::text)
  from unnest(coalesce(_user_ids, array[]::uuid[])) as recipients(user_id)
  where user_id is not null;
end;
$$;

create or replace function public.notify_company_users(
  _company_ids uuid[],
  _type public.notification_type,
  _title text,
  _body text default null,
  _related_entity_id uuid default null,
  _related_entity_type text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.notifications (user_id, type, title, body, related_entity_id, related_entity_type)
  select distinct p.id, coalesce(_type, 'system'::public.notification_type), _title, _body, _related_entity_id, coalesce(_related_entity_type, _type::text)
  from public.profiles p
  where p.company_id = any(coalesce(_company_ids, array[]::uuid[]))
    and p.is_active = true;
end;
$$;

create or replace function public.accept_quote_as_order(_quote_id uuid)
returns table(order_id uuid, order_number text, already_exists boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor_id uuid := auth.uid();
  _quote record;
  _existing_order record;
  _order public.orders%rowtype;
  _items_count integer;
  _amount_without_vat numeric;
  _vat_amount numeric;
  _delivery_cost numeric;
  _total_amount numeric;
  _open_quotes_count integer;
begin
  if _actor_id is null then
    raise exception 'Authentication required';
  end if;

  select
    q.*,
    r.buyer_company_id,
    r.delivery_address,
    r.title as rfq_title
  into _quote
  from public.quotes q
  join public.rfqs r on r.id = q.rfq_id
  where q.id = _quote_id;

  if not found then
    raise exception 'Commercial proposal not found';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = _actor_id
      and p.company_id = _quote.buyer_company_id
      and p.role in ('buyer', 'manager', 'admin')
      and p.is_active = true
  ) then
    raise exception 'Only the buyer company can accept this commercial proposal';
  end if;

  select o.id, o.order_number
  into _existing_order
  from public.orders o
  where o.quote_id = _quote_id
  limit 1;

  if found then
    order_id := _existing_order.id;
    order_number := _existing_order.order_number;
    already_exists := true;
    return next;
    return;
  end if;

  if _quote.status not in ('sent', 'accepted') then
    raise exception 'Commercial proposal cannot be accepted in current status';
  end if;

  select count(*)
  into _items_count
  from public.quote_items qi
  where qi.quote_id = _quote_id;

  if _items_count = 0 then
    raise exception 'Commercial proposal has no items';
  end if;

  select
    coalesce(_quote.total_without_vat, sum(coalesce(qi.line_total, qi.price * qi.quantity)), 0),
    coalesce(_quote.vat_amount, round((coalesce(_quote.total_without_vat, sum(coalesce(qi.line_total, qi.price * qi.quantity)), 0) * 0.2)::numeric, 2), 0),
    coalesce(_quote.delivery_cost, 0),
    coalesce(
      _quote.total_amount,
      coalesce(_quote.total_without_vat, sum(coalesce(qi.line_total, qi.price * qi.quantity)), 0)
        + coalesce(_quote.vat_amount, round((coalesce(_quote.total_without_vat, sum(coalesce(qi.line_total, qi.price * qi.quantity)), 0) * 0.2)::numeric, 2), 0)
        + coalesce(_quote.delivery_cost, 0),
      0
    )
  into _amount_without_vat, _vat_amount, _delivery_cost, _total_amount
  from public.quote_items qi
  where qi.quote_id = _quote_id;

  insert into public.orders (
    buyer_company_id,
    supplier_company_id,
    rfq_id,
    quote_id,
    created_by,
    delivery_address,
    comment,
    status,
    payment_status,
    amount_without_vat,
    vat_amount,
    delivery_cost,
    total_amount
  ) values (
    _quote.buyer_company_id,
    _quote.supplier_company_id,
    _quote.rfq_id,
    _quote.id,
    _actor_id,
    _quote.delivery_address,
    'Создано из запроса на закупку "' || coalesce(_quote.rfq_title, 'без названия') || '"',
    'confirmed',
    'pending',
    _amount_without_vat,
    _vat_amount,
    _delivery_cost,
    _total_amount
  )
  returning * into _order;

  insert into public.order_items (
    order_id,
    material_id,
    material_name,
    quantity,
    unit,
    price,
    vat_rate,
    line_total,
    supplier_offer_id
  )
  select
    _order.id,
    qi.material_id,
    coalesce(qi.material_name, 'Материал'),
    qi.quantity,
    coalesce(qi.unit, 'шт'),
    qi.price,
    coalesce(qi.vat_rate, 20),
    coalesce(qi.line_total, qi.price * qi.quantity),
    null
  from public.quote_items qi
  where qi.quote_id = _quote_id;

  update public.quotes
  set status = 'accepted', updated_at = now()
  where id = _quote_id;

  select count(*)
  into _open_quotes_count
  from public.quotes q
  where q.rfq_id = _quote.rfq_id
    and q.status in ('sent', 'draft');

  update public.rfqs
  set status = case when _open_quotes_count > 0 then 'quoted'::public.rfq_status else 'closed'::public.rfq_status end,
      updated_at = now()
  where id = _quote.rfq_id;

  insert into public.notifications (user_id, type, title, body, related_entity_id, related_entity_type)
  select distinct p.id,
    'order'::public.notification_type,
    'Покупатель принял коммерческое предложение',
    'По запросу на закупку "' || coalesce(_quote.rfq_title, 'без названия') || '" создан заказ.',
    _order.id,
    'order'
  from public.profiles p
  where p.company_id = _quote.supplier_company_id
    and p.is_active = true;

  insert into public.notifications (user_id, type, title, body, related_entity_id, related_entity_type)
  values (
    _actor_id,
    'order'::public.notification_type,
    'Заказ создан из коммерческого предложения',
    'Заказ по запросу на закупку "' || coalesce(_quote.rfq_title, 'без названия') || '" создан и доступен в разделе заказов.',
    _order.id,
    'order'
  );

  order_id := _order.id;
  order_number := _order.order_number;
  already_exists := false;
  return next;
end;
$$;

grant execute on function public.notify_users(uuid[], public.notification_type, text, text, uuid, text) to authenticated;
grant execute on function public.notify_company_users(uuid[], public.notification_type, text, text, uuid, text) to authenticated;
grant execute on function public.accept_quote_as_order(uuid) to authenticated;
