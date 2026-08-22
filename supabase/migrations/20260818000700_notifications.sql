-- Phase 1: in-app notifications

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  work_order_id uuid references public.work_orders (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_id_idx on public.notifications (profile_id, created_at desc);
create index notifications_org_id_idx on public.notifications (org_id);
create index notifications_work_order_id_idx on public.notifications (work_order_id);

alter table public.notifications enable row level security;

revoke all on table public.notifications from public, anon;
grant select, update on table public.notifications to authenticated;

create policy notifications_select_own
on public.notifications for select to authenticated
using (profile_id = (select auth.uid()));

create policy notifications_update_own
on public.notifications for update to authenticated
using (profile_id = (select auth.uid()))
with check (
  profile_id = (select auth.uid())
  and org_id = (select (private.current_profile()).org_id)
);
