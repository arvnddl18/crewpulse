-- Phase 1.5: job photos (private Storage + attachments metadata)

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  path text not null unique,
  mime text,
  created_at timestamptz not null default now()
);

create index attachments_work_order_id_idx on public.attachments (work_order_id);
create index attachments_org_id_idx on public.attachments (org_id);
create index attachments_uploaded_by_idx on public.attachments (uploaded_by);

alter table public.attachments enable row level security;

revoke all on table public.attachments from public, anon;
grant select, insert on table public.attachments to authenticated;

create policy attachments_select
on public.attachments for select to authenticated
using (
  exists (
    select 1 from public.work_orders w
    where w.id = work_order_id
      and (select private.work_order_visible(w))
  )
);

create policy attachments_insert
on public.attachments for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1 from public.work_orders w
    where w.id = work_order_id
      and w.org_id = org_id
      and (select private.work_order_visible(w))
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-attachments',
  'job-attachments',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy job_attachments_select
on storage.objects for select to authenticated
using (
  bucket_id = 'job-attachments'
  and exists (
    select 1 from public.work_orders w
    where w.id = ((storage.foldername(name))[2])::uuid
      and w.org_id = ((storage.foldername(name))[1])::uuid
      and (select private.work_order_visible(w))
  )
);

create policy job_attachments_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'job-attachments'
  and exists (
    select 1 from public.work_orders w
    where w.id = ((storage.foldername(name))[2])::uuid
      and w.org_id = ((storage.foldername(name))[1])::uuid
      and (select private.work_order_visible(w))
  )
);
