-- Phase 1: private helpers + profiles + auth trigger

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id),
  full_name text not null,
  email text not null,
  phone text,
  role text not null,
  is_active boolean not null default true,
  avatar_url text,
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'dispatcher', 'team_lead', 'technician')),
  constraint profiles_theme_check check (theme in ('dark', 'light'))
);

create index profiles_org_id_idx on public.profiles (org_id);
create index profiles_org_role_idx on public.profiles (org_id, role);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create or replace function private.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.profiles p
  where p.id = (select auth.uid())
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
      and p.role in ('admin', 'dispatcher', 'team_lead')
  );
$$;

create or replace function private.same_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.org_id = p_org
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
      and p.role = 'admin'
  );
$$;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.current_profile()
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_staff()
$$;

create or replace function public.same_org(p_org uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.same_org(p_org)
$$;

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

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon;
grant select, update on table public.profiles to authenticated;

drop policy if exists organizations_select_same_org on public.organizations;
create policy organizations_select_same_org
on public.organizations
for select
to authenticated
using ((select private.same_org(id)));

create policy profiles_select
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (
    (select private.is_staff())
    and (select private.same_org(org_id))
  )
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and org_id = (select (private.current_profile()).org_id)
  and role = (select (private.current_profile()).role)
  and is_active = (select (private.current_profile()).is_active)
);

create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (
  (select private.is_admin())
  and (select private.same_org(org_id))
)
with check (
  (select private.is_admin())
  and (select private.same_org(org_id))
);

revoke all on function private.current_profile() from public, anon;
revoke all on function private.is_staff() from public, anon;
revoke all on function private.same_org(uuid) from public, anon;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.current_profile() to authenticated;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.same_org(uuid) to authenticated;
grant execute on function private.is_admin() to authenticated;

revoke all on function public.current_profile() from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.same_org(uuid) from public, anon;
grant execute on function public.current_profile() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.same_org(uuid) to authenticated;
