-- Phase 1: audit log (writes from RPCs only)

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_id_idx on public.audit_logs (org_id, created_at desc);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

alter table public.audit_logs enable row level security;

revoke all on table public.audit_logs from public, anon;
grant select on table public.audit_logs to authenticated;

create policy audit_logs_select_admin
on public.audit_logs for select to authenticated
using (
  (select private.is_admin())
  and (select private.same_org(org_id))
);
