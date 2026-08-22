-- Chat tables: chat_threads, chat_thread_members, chat_messages

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  kind text not null,
  work_order_id uuid references public.work_orders (id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_threads_kind_check check (kind in ('direct', 'dispatcher', 'work_order')),
  constraint chat_threads_wo_unique unique (work_order_id) -- one thread per WO
);

create index chat_threads_org_idx on public.chat_threads (org_id);
create index chat_threads_kind_idx on public.chat_threads (org_id, kind);

create trigger chat_threads_set_updated_at
before update on public.chat_threads
for each row execute function private.set_updated_at();

create table public.chat_thread_members (
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (thread_id, profile_id)
);

create index chat_thread_members_profile_idx on public.chat_thread_members (profile_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text,
  attachment_id uuid references public.attachments (id) on delete set null,
  created_at timestamptz not null default now()
);

create index chat_messages_thread_created_idx on public.chat_messages (thread_id, created_at);
create index chat_messages_author_idx on public.chat_messages (author_id);

-- Helper: is the current user a member of a given thread?
create or replace function private.is_thread_member(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chat_thread_members
    where thread_id = p_thread_id
      and profile_id = (select auth.uid())
  );
$$;

-- Trigger: bump chat_threads.updated_at on new message
create or replace function private.bump_thread_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_threads
  set updated_at = pg_catalog.now()
  where id = new.thread_id;
  return new;
end;
$$;

create trigger chat_messages_bump_thread
after insert on public.chat_messages
for each row execute function private.bump_thread_updated_at();

-- RLS: chat_threads
alter table public.chat_threads enable row level security;
revoke all on table public.chat_threads from public, anon;
grant select, insert, update on table public.chat_threads to authenticated;

create policy chat_threads_select
on public.chat_threads for select to authenticated
using (
  (select private.same_org(org_id))
  and (select private.is_thread_member(id))
);

create policy chat_threads_insert
on public.chat_threads for insert to authenticated
with check (
  (select private.same_org(org_id))
);

-- RLS: chat_thread_members
alter table public.chat_thread_members enable row level security;
revoke all on table public.chat_thread_members from public, anon;
grant select, insert, update on table public.chat_thread_members to authenticated;

create policy chat_thread_members_select
on public.chat_thread_members for select to authenticated
using (
  (select private.is_thread_member(thread_id))
);

create policy chat_thread_members_insert
on public.chat_thread_members for insert to authenticated
with check (
  exists (
    select 1 from public.chat_threads t
    where t.id = thread_id
      and (select private.same_org(t.org_id))
  )
);

-- RLS: chat_messages
alter table public.chat_messages enable row level security;
revoke all on table public.chat_messages from public, anon;
grant select, insert on table public.chat_messages to authenticated;

create policy chat_messages_select
on public.chat_messages for select to authenticated
using (
  (select private.same_org(org_id))
  and (select private.is_thread_member(thread_id))
);

create policy chat_messages_insert
on public.chat_messages for insert to authenticated
with check (
  (select private.same_org(org_id))
  and (select private.is_thread_member(thread_id))
  and author_id = (select auth.uid())
);

-- Realtime
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_threads;

-- Helper: find existing direct thread between two users
create or replace function public.find_direct_thread(p_user_a uuid, p_user_b uuid)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select t.id
  from public.chat_threads t
  where t.kind = 'direct'
    and exists (
      select 1 from public.chat_thread_members m
      where m.thread_id = t.id and m.profile_id = p_user_a
    )
    and exists (
      select 1 from public.chat_thread_members m
      where m.thread_id = t.id and m.profile_id = p_user_b
    )
  limit 1;
$$;

revoke all on function public.find_direct_thread(uuid, uuid) from public, anon;
grant execute on function public.find_direct_thread(uuid, uuid) to authenticated;
revoke all on function private.is_thread_member(uuid) from public, anon;
grant execute on function private.is_thread_member(uuid) to authenticated;

-- Atomic thread + members creation (avoids RLS chicken-and-egg)
create or replace function public.create_direct_thread(p_org_id uuid, p_other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_thread_id uuid;
begin
  select public.find_direct_thread(v_me, p_other_id) into v_thread_id;
  if v_thread_id is not null then
    return v_thread_id;
  end if;

  insert into public.chat_threads (org_id, kind)
  values (p_org_id, 'direct')
  returning id into v_thread_id;

  insert into public.chat_thread_members (thread_id, profile_id)
  values (v_thread_id, v_me), (v_thread_id, p_other_id);

  return v_thread_id;
end;
$$;

revoke all on function public.create_direct_thread(uuid, uuid) from public, anon;
grant execute on function public.create_direct_thread(uuid, uuid) to authenticated;
