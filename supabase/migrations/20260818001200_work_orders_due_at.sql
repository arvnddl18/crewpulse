-- Phase 2: SLA due_at on live work orders

alter table public.work_orders
add column due_at timestamptz;

create index work_orders_org_due_at_idx on public.work_orders (org_id, due_at)
where due_at is not null;

-- Backfill due_at from scheduled_end where present
update public.work_orders
set due_at = scheduled_end
where scheduled_end is not null and due_at is null;
