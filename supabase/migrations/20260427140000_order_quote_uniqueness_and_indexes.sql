create unique index if not exists orders_quote_id_unique
  on public.orders (quote_id)
  where quote_id is not null;

create index if not exists orders_rfq_id_idx
  on public.orders (rfq_id);

create index if not exists shipments_order_id_idx
  on public.shipments (order_id);
