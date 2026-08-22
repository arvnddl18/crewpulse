-- Phase 1: work order timeline

create table public.work_order_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint work_order_events_type_check check (
    event_type in ('created', 'status_changed', 'assigned', 'reassigned', 'note')
  )
);

create index work_order_events_work_order_id_idx on public.work_order_events (work_order_id);
create index work_order_events_org_id_idx on public.work_order_events (org_id);
create index work_order_events_actor_id_idx on public.work_order_events (actor_id);

create table public.work_order_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create index work_order_notes_work_order_id_idx on public.work_order_notes (work_order_id);
create index work_order_notes_org_id_idx on public.work_order_notes (org_id);
create index work_order_notes_author_id_idx on public.work_order_notes (author_id);

alter table public.work_order_events enable row level security;
alter table public.work_order_notes enable row level security;

revoke all on table public.work_order_events from public, anon;
revoke all on table public.work_order_notes from public, anon;
grant select, insert on table public.work_order_events to authenticated;
grant select, insert on table public.work_order_notes to authenticated;

create policy work_order_events_select
on public.work_order_events for select to authenticated
using (
  exists (
    select 1 from public.work_orders w
    where w.id = work_order_id
      and (select private.work_order_visible(w))
  )
);

create policy work_order_events_insert
on public.work_order_events for insert to authenticated
with check (
  actor_id = (select auth.uid())
  and exists (
    select 1 from public.work_orders w
    where w.id = work_order_id
      and w.org_id = org_id
      and (select private.work_order_visible(w))
  )
);

create policy work_order_notes_select
on public.work_order_notes for select to authenticated
using (
  exists (
    select 1 from public.work_orders w
    where w.id = work_order_id
      and (select private.work_order_visible(w))
  )
);

create policy work_order_notes_insert
on public.work_order_notes for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.work_orders w
    where w.id = work_order_id
      and w.org_id = org_id
      and (select private.work_order_visible(w))
  )
);
