-- Phase 1: organizations (single-tenant MVP, RLS still org-scoped)

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Asia/Manila',
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

revoke all on table public.organizations from public, anon;
grant select on table public.organizations to authenticated;

-- Bootstrap org so auth.users → profiles trigger has an org_id.
insert into public.organizations (id, name, slug, timezone)
values (
  '00000000-0000-4000-8000-000000000001',
  'CrewPulse Demo',
  'crewpulse-demo',
  'Asia/Manila'
);
