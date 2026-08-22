-- Phase 2: CRM/BSS report uploads + slot adherence facts

create table public.report_uploads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  uploaded_by uuid not null references public.profiles (id),
  original_filename text not null,
  as_of_date date,
  storage_path text not null unique,
  status text not null,
  row_count int,
  error text,
  created_at timestamptz not null default now(),
  constraint report_uploads_status_check check (
    status in ('pending', 'parsing', 'ready', 'failed')
  )
);

create index report_uploads_org_created_idx on public.report_uploads (org_id, created_at desc);
create index report_uploads_org_status_idx on public.report_uploads (org_id, status);

create table public.slot_adherence_rows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  upload_id uuid not null references public.report_uploads (id) on delete cascade,
  work_order_number text not null,
  slot_raw text,
  slot_date date,
  slot_period text,
  status text,
  substatus text,
  skillset text,
  queue text,
  team_name text,
  contractor_name text,
  delay_reason text,
  sla_bucket text,
  created_at_src timestamptz,
  completed_at_src timestamptz,
  adhered boolean not null default false,
  created_at timestamptz not null default now(),
  constraint slot_adherence_rows_slot_period_check check (
    slot_period is null or slot_period in ('AM', 'PM')
  ),
  constraint slot_adherence_rows_upload_wo_unique unique (upload_id, work_order_number)
);

create index slot_adherence_rows_upload_idx on public.slot_adherence_rows (upload_id);
create index slot_adherence_rows_org_upload_idx on public.slot_adherence_rows (org_id, upload_id);
create index slot_adherence_rows_adhered_idx on public.slot_adherence_rows (upload_id, adhered);
create index slot_adherence_rows_skillset_idx on public.slot_adherence_rows (upload_id, skillset);
create index slot_adherence_rows_sla_bucket_idx on public.slot_adherence_rows (upload_id, sla_bucket);

alter table public.report_uploads enable row level security;
alter table public.slot_adherence_rows enable row level security;

revoke all on table public.report_uploads from public, anon;
revoke all on table public.slot_adherence_rows from public, anon;
grant select, insert, update, delete on table public.report_uploads to authenticated;
grant select, insert, delete on table public.slot_adherence_rows to authenticated;

create policy report_uploads_select_staff
on public.report_uploads for select to authenticated
using ((select private.is_staff()) and (select private.same_org(org_id)));

create policy report_uploads_insert_staff
on public.report_uploads for insert to authenticated
with check (
  (select private.is_staff())
  and (select private.same_org(org_id))
  and uploaded_by = (select auth.uid())
);

create policy report_uploads_update_staff
on public.report_uploads for update to authenticated
using (
  (select private.is_staff())
  and (select private.same_org(org_id))
  and (
    (select private.is_admin())
    or (
      uploaded_by = (select auth.uid())
      and status in ('pending', 'failed')
    )
  )
)
with check ((select private.same_org(org_id)));

create policy report_uploads_delete_admin
on public.report_uploads for delete to authenticated
using ((select private.is_admin()) and (select private.same_org(org_id)));

create policy slot_adherence_rows_select_staff
on public.slot_adherence_rows for select to authenticated
using ((select private.is_staff()) and (select private.same_org(org_id)));

create policy slot_adherence_rows_insert_staff
on public.slot_adherence_rows for insert to authenticated
with check ((select private.is_staff()) and (select private.same_org(org_id)));

create policy slot_adherence_rows_delete_staff
on public.slot_adherence_rows for delete to authenticated
using ((select private.is_staff()) and (select private.same_org(org_id)));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-uploads',
  'report-uploads',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

create policy report_uploads_storage_select
on storage.objects for select to authenticated
using (
  bucket_id = 'report-uploads'
  and (select private.is_staff())
  and ((storage.foldername(name))[1])::uuid = (select (private.current_profile()).org_id)
);

create policy report_uploads_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'report-uploads'
  and (select private.is_staff())
  and ((storage.foldername(name))[1])::uuid = (select (private.current_profile()).org_id)
);

create policy report_uploads_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'report-uploads'
  and (select private.is_admin())
  and ((storage.foldername(name))[1])::uuid = (select (private.current_profile()).org_id)
);
