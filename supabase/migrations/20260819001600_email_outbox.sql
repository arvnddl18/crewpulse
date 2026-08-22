-- Phase 3: email outbox + profile email preference

alter table public.profiles
add column if not exists email_notifications boolean not null default true;

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  to_email text not null,
  subject text not null,
  body text not null,
  notification_type text not null,
  work_order_id uuid references public.work_orders (id) on delete set null,
  status text not null default 'pending',
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint email_outbox_status_check check (
    status in ('pending', 'sent', 'failed', 'skipped')
  )
);

create index email_outbox_pending_idx
on public.email_outbox (status, created_at)
where status = 'pending';

create index email_outbox_org_idx on public.email_outbox (org_id, created_at desc);

alter table public.email_outbox enable row level security;

revoke all on table public.email_outbox from public, anon;
grant select on table public.email_outbox to authenticated;

create policy email_outbox_select_admin
on public.email_outbox
for select
to authenticated
using (
  (select private.is_admin())
  and (select private.same_org(org_id))
);

create or replace function private.notify_profile(
  p_org uuid,
  p_profile uuid,
  p_type text,
  p_title text,
  p_body text,
  p_work_order uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_email text;
  v_enabled boolean;
begin
  insert into public.notifications (org_id, profile_id, type, title, body, work_order_id)
  values (p_org, p_profile, p_type, p_title, p_body, p_work_order);

  select p.email, p.email_notifications
  into v_email, v_enabled
  from public.profiles p
  where p.id = p_profile;

  if v_enabled
    and v_email is not null
    and length(trim(v_email)) > 0
  then
    insert into public.email_outbox (
      org_id,
      profile_id,
      to_email,
      subject,
      body,
      notification_type,
      work_order_id
    ) values (
      p_org,
      p_profile,
      trim(v_email),
      p_title,
      coalesce(p_body, ''),
      p_type,
      p_work_order
    );
  end if;
end;
$$;

revoke all on function private.notify_profile(uuid, uuid, text, text, text, uuid) from public, anon, authenticated;
