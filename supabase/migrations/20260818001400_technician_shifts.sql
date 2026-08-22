-- Phase 2: technician shift calendar

create table public.technician_shifts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint technician_shifts_window_check check (ends_at > starts_at)
);

create index technician_shifts_org_starts_idx on public.technician_shifts (org_id, starts_at);
create index technician_shifts_profile_starts_idx on public.technician_shifts (profile_id, starts_at);

alter table public.technician_shifts enable row level security;

revoke all on table public.technician_shifts from public, anon;
grant select, insert, update, delete on table public.technician_shifts to authenticated;

create policy technician_shifts_select_staff
on public.technician_shifts for select to authenticated
using ((select private.is_staff()) and (select private.same_org(org_id)));

create policy technician_shifts_select_self
on public.technician_shifts for select to authenticated
using (profile_id = (select auth.uid()));

create policy technician_shifts_insert_staff
on public.technician_shifts for insert to authenticated
with check (
  (select private.is_staff())
  and (select private.same_org(org_id))
  and created_by = (select auth.uid())
);

create policy technician_shifts_update_staff
on public.technician_shifts for update to authenticated
using (
  (select private.is_staff())
  and (select private.same_org(org_id))
)
with check ((select private.same_org(org_id)));

create policy technician_shifts_delete_staff
on public.technician_shifts for delete to authenticated
using (
  (select private.is_staff())
  and (select private.same_org(org_id))
);
