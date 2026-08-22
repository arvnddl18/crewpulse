-- Phase 1: work orders

create sequence public.work_order_number_seq;

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  number text not null unique,
  title text not null,
  description text,
  status text not null,
  priority text not null,
  customer_name text,
  customer_phone text,
  site_address text not null,
  site_lat numeric,
  site_lng numeric,
  required_skill_id uuid references public.skills (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  assigned_technician_id uuid references public.profiles (id) on delete set null,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_orders_status_check check (
    status in (
      'draft',
      'queued',
      'assigned',
      'accepted',
      'en_route',
      'on_site',
      'in_progress',
      'paused',
      'completed',
      'cancelled',
      'needs_followup'
    )
  ),
  constraint work_orders_priority_check check (
    priority in ('low', 'medium', 'high', 'critical')
  )
);

create index work_orders_org_status_idx on public.work_orders (org_id, status);
create index work_orders_assigned_technician_id_idx on public.work_orders (assigned_technician_id);
create index work_orders_org_priority_idx on public.work_orders (org_id, priority);
create index work_orders_number_idx on public.work_orders (number);
create index work_orders_team_id_idx on public.work_orders (team_id);
create index work_orders_required_skill_id_idx on public.work_orders (required_skill_id);
create index work_orders_created_by_idx on public.work_orders (created_by);

create trigger work_orders_set_updated_at
before update on public.work_orders
for each row execute function private.set_updated_at();

create or replace function private.next_work_order_number()
returns text
language sql
security definer
set search_path = ''
as $$
  select
    'WO-'
    || to_char((pg_catalog.now() at time zone 'Asia/Manila'), 'YYYY')
    || '-'
    || lpad(nextval('public.work_order_number_seq')::text, 4, '0')
$$;

create or replace function private.work_order_visible(p_wo public.work_orders)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.same_org(p_wo.org_id))
    and (
      (select private.is_admin())
      or (
        (select (private.current_profile()).role) = 'dispatcher'
      )
      or (
        (select (private.current_profile()).role) = 'team_lead'
        and (
          p_wo.team_id in (select private.lead_team_ids())
          or p_wo.assigned_technician_id in (
            select tm.profile_id
            from public.team_members tm
            where tm.team_id in (select private.lead_team_ids())
          )
        )
      )
      or p_wo.assigned_technician_id = (select auth.uid())
    );
$$;

alter table public.work_orders enable row level security;

revoke all on table public.work_orders from public, anon;
grant select, insert, update on table public.work_orders to authenticated;

create policy work_orders_select
on public.work_orders for select to authenticated
using ((select private.work_order_visible(work_orders)));

create policy work_orders_insert_staff
on public.work_orders for insert to authenticated
with check (
  (select private.is_staff())
  and (select private.same_org(org_id))
  and created_by = (select auth.uid())
);

create policy work_orders_update_staff
on public.work_orders for update to authenticated
using (
  (select private.is_staff())
  and (select private.work_order_visible(work_orders))
)
with check (
  (select private.is_staff())
  and (select private.same_org(org_id))
);

create policy work_orders_update_assignee
on public.work_orders for update to authenticated
using (assigned_technician_id = (select auth.uid()))
with check (
  assigned_technician_id = (select auth.uid())
  and org_id = (select (private.current_profile()).org_id)
);

revoke all on function private.next_work_order_number() from public, anon, authenticated;
revoke all on function private.work_order_visible(public.work_orders) from public, anon;
grant execute on function private.work_order_visible(public.work_orders) to authenticated;
