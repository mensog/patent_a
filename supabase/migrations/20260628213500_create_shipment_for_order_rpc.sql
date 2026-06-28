-- Controlled supplier shipment creation for the demo lifecycle.
-- Avoids fragile direct inserts from the browser while keeping RLS enabled.

create or replace function public.create_shipment_for_order(
  _order_id uuid,
  _shipment_number text default null,
  _planned_date date default null,
  _driver_name text default null,
  _driver_phone text default null,
  _vehicle_info text default null,
  _tracking_number text default null,
  _route_note text default null
)
returns table(shipment_id uuid, shipment_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor_id uuid := auth.uid();
  _order public.orders%rowtype;
  _shipment public.shipments%rowtype;
  _items_count integer;
begin
  if _actor_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into _order
  from public.orders o
  where o.id = _order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = _actor_id
      and p.company_id = _order.supplier_company_id
      and p.role in ('supplier', 'manager', 'admin')
      and p.is_active = true
  ) then
    raise exception 'Only the supplier company can create shipments for this order';
  end if;

  if _order.status in ('received', 'closed', 'cancelled') then
    raise exception 'Shipment cannot be created for this order status';
  end if;

  select count(*)
  into _items_count
  from public.order_items oi
  where oi.order_id = _order_id;

  if _items_count = 0 then
    raise exception 'Order has no items to ship';
  end if;

  insert into public.shipments (
    order_id,
    supplier_company_id,
    shipment_number,
    status,
    planned_date,
    driver_name,
    driver_phone,
    vehicle_info,
    tracking_number,
    route_note
  ) values (
    _order.id,
    _order.supplier_company_id,
    nullif(trim(coalesce(_shipment_number, '')), ''),
    'planned',
    _planned_date,
    nullif(trim(coalesce(_driver_name, '')), ''),
    nullif(trim(coalesce(_driver_phone, '')), ''),
    nullif(trim(coalesce(_vehicle_info, '')), ''),
    nullif(trim(coalesce(_tracking_number, '')), ''),
    nullif(trim(coalesce(_route_note, '')), '')
  )
  returning * into _shipment;

  insert into public.shipment_items (shipment_id, order_item_id, quantity)
  select _shipment.id, oi.id, oi.quantity
  from public.order_items oi
  where oi.order_id = _order.id;

  if _order.status = 'confirmed' then
    update public.orders
    set status = 'in_progress', updated_at = now()
    where id = _order.id;
  end if;

  insert into public.notifications (user_id, type, title, body, related_entity_id, related_entity_type)
  select distinct p.id,
    'shipment'::public.notification_type,
    'Поставщик создал отгрузку',
    'По заказу ' || coalesce('#' || _order.order_number, left(_order.id::text, 8)) || ' создана новая отгрузка' ||
      case when _planned_date is not null then ' на ' || to_char(_planned_date, 'DD.MM.YYYY') else '' end || '.',
    _shipment.id,
    'shipment'
  from public.profiles p
  where p.company_id = _order.buyer_company_id
    and p.is_active = true;

  shipment_id := _shipment.id;
  shipment_number := _shipment.shipment_number;
  return next;
end;
$$;

grant execute on function public.create_shipment_for_order(uuid, text, date, text, text, text, text, text) to authenticated;
