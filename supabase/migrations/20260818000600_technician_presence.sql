-- Phase 1: technician presence

create table public.technician_presence (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id),
  status text not null,
  current_work_order_id uuid references public.work_orders (id) on delete set null,
  last_seen_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint technician_presence_status_check check (
    status in ('offline', 'available', 'on_break', 'en_route', 'on_site')
  )
);

create index technician_presence_org_id_idx on public.technician_presence (org_id);
create index technician_presence_current_work_order_id_idx
on public.technician_presence (current_work_order_id);

create trigger technician_presence_set_updated_at
before update on public.technician_presence
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_role text;
  v_name text;
begin
  v_org := nullif(new.raw_app_meta_data ->> 'org_id', '')::uuid;
  if v_org is null then
    select o.id
    into v_org
    from public.organizations o
    order by o.created_at asc
    limit 1;
  end if;

  if v_org is null then
    raise exception 'No organization exists to attach a profile';
  end if;

  v_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'technician');
  if v_role not in ('admin', 'dispatcher', 'team_lead', 'technician') then
    v_role := 'technician';
  end if;

  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, 'user'), '@', 1)
  );

  insert into public.profiles (id, org_id, full_name, email, role)
  values (new.id, v_org, v_name, coalesce(new.email, ''), v_role);

  insert into public.technician_presence (profile_id, org_id, status, last_seen_at)
  values (new.id, v_org, 'offline', pg_catalog.now());

  return new;
end;
$$;

alter table public.technician_presence enable row level security;

revoke all on table public.technician_presence from public, anon;
grant select, insert, update on table public.technician_presence to authenticated;

create policy technician_presence_select
on public.technician_presence for select to authenticated
using (
  profile_id = (select auth.uid())
  or (
    (select private.is_staff())
    and (select private.same_org(org_id))
  )
);

create policy technician_presence_insert_self
on public.technician_presence for insert to authenticated
with check (profile_id = (select auth.uid()) and (select private.same_org(org_id)));

create policy technician_presence_update_self
on public.technician_presence for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()) and (select private.same_org(org_id)));

create policy technician_presence_update_admin
on public.technician_presence for update to authenticated
using (
  (select private.is_admin())
  and (select private.same_org(org_id))
)
with check (
  (select private.is_admin())
  and (select private.same_org(org_id))
);
