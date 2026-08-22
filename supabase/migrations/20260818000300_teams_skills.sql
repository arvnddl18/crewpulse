-- Phase 1: teams, membership, skills

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  name text not null,
  color text not null,
  lead_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index teams_org_id_idx on public.teams (org_id);
create index teams_lead_id_idx on public.teams (lead_id);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  is_primary boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

create index team_members_profile_id_idx on public.team_members (profile_id);

create unique index team_members_one_primary
on public.team_members (profile_id)
where is_primary;

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  name text not null,
  category text,
  unique (org_id, name)
);

create index skills_org_id_idx on public.skills (org_id);

create table public.technician_skills (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (profile_id, skill_id)
);

create index technician_skills_skill_id_idx on public.technician_skills (skill_id);

create or replace function private.lead_team_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.id
  from public.teams t
  where t.lead_id = (select auth.uid())
$$;

create or replace function public.lead_team_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select private.lead_team_ids()
$$;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.skills enable row level security;
alter table public.technician_skills enable row level security;

revoke all on table public.teams from public, anon;
revoke all on table public.team_members from public, anon;
revoke all on table public.skills from public, anon;
revoke all on table public.technician_skills from public, anon;

grant select on table public.teams to authenticated;
grant select on table public.team_members to authenticated;
grant select on table public.skills to authenticated;
grant select on table public.technician_skills to authenticated;
grant insert, update, delete on table public.teams to authenticated;
grant insert, update, delete on table public.team_members to authenticated;
grant insert, update, delete on table public.skills to authenticated;
grant insert, update, delete on table public.technician_skills to authenticated;

create policy teams_select
on public.teams for select to authenticated
using ((select private.same_org(org_id)));

create policy teams_write_admin
on public.teams for all to authenticated
using ((select private.is_admin()) and (select private.same_org(org_id)))
with check ((select private.is_admin()) and (select private.same_org(org_id)));

create policy team_members_select
on public.team_members for select to authenticated
using (
  exists (
    select 1 from public.teams t
    where t.id = team_id
      and (select private.same_org(t.org_id))
  )
);

create policy team_members_write_admin
on public.team_members for all to authenticated
using (
  (select private.is_admin())
  and exists (
    select 1 from public.teams t
    where t.id = team_id
      and (select private.same_org(t.org_id))
  )
)
with check (
  (select private.is_admin())
  and exists (
    select 1 from public.teams t
    where t.id = team_id
      and (select private.same_org(t.org_id))
  )
);

create policy skills_select
on public.skills for select to authenticated
using ((select private.same_org(org_id)));

create policy skills_write_admin
on public.skills for all to authenticated
using ((select private.is_admin()) and (select private.same_org(org_id)))
with check ((select private.is_admin()) and (select private.same_org(org_id)));

create policy technician_skills_select
on public.technician_skills for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id
      and (select private.same_org(p.org_id))
  )
);

create policy technician_skills_write_admin
on public.technician_skills for all to authenticated
using (
  (select private.is_admin())
  and exists (
    select 1 from public.profiles p
    where p.id = profile_id
      and (select private.same_org(p.org_id))
  )
)
with check (
  (select private.is_admin())
  and exists (
    select 1 from public.profiles p
    where p.id = profile_id
      and (select private.same_org(p.org_id))
  )
);

revoke all on function private.lead_team_ids() from public, anon;
grant execute on function private.lead_team_ids() to authenticated;
revoke all on function public.lead_team_ids() from public, anon;
grant execute on function public.lead_team_ids() to authenticated;
