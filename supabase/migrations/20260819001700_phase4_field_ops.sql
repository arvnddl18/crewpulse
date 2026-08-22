-- Phase 4: checklists, job chat, foreground GPS

alter table public.profiles
  add column if not exists location_sharing_opt_in boolean not null default false;

-- ---------------------------------------------------------------------------
-- Checklists
-- ---------------------------------------------------------------------------

create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  skill_id uuid not null references public.skills (id),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, skill_id)
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  org_id uuid not null references public.organizations (id),
  label text not null,
  sort_order int not null,
  is_required boolean not null default true,
  requires_photo boolean not null default false
);

create index if not exists checklist_items_template_idx on public.checklist_items (template_id, sort_order);

create table if not exists public.work_order_checklist_responses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  item_id uuid not null references public.checklist_items (id) on delete cascade,
  completed boolean not null default false,
  attachment_id uuid references public.attachments (id),
  completed_by uuid references public.profiles (id),
  completed_at timestamptz,
  unique (work_order_id, item_id)
);

-- ---------------------------------------------------------------------------
-- Job chat
-- ---------------------------------------------------------------------------

create table if not exists public.work_order_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text,
  attachment_id uuid references public.attachments (id),
  created_at timestamptz not null default now(),
  constraint work_order_messages_body_or_attachment check (
    (body is not null and length(trim(body)) > 0) or attachment_id is not null
  )
);

create index if not exists work_order_messages_wo_idx on public.work_order_messages (work_order_id, created_at);

-- ---------------------------------------------------------------------------
-- Foreground GPS pings
-- ---------------------------------------------------------------------------

create table if not exists public.technician_location_pings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  profile_id uuid not null references public.profiles (id),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  lat numeric not null,
  lng numeric not null,
  accuracy_m numeric,
  recorded_at timestamptz not null default now()
);

create index if not exists technician_location_pings_org_recorded_idx
  on public.technician_location_pings (org_id, recorded_at desc);
create index if not exists technician_location_pings_wo_recorded_idx
  on public.technician_location_pings (work_order_id, recorded_at desc);
create index if not exists technician_location_pings_profile_recorded_idx
  on public.technician_location_pings (profile_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Checklist gate helper
-- ---------------------------------------------------------------------------

create or replace function private.checklist_complete_for_wo(p_wo uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_skill uuid;
  v_template uuid;
  v_required int;
  v_done int;
begin
  select required_skill_id into v_skill
  from public.work_orders
  where id = p_wo;

  if v_skill is null then
    return true;
  end if;

  select id into v_template
  from public.checklist_templates
  where skill_id = v_skill and is_active
  limit 1;

  if v_template is null then
    return true;
  end if;

  select count(*) into v_required
  from public.checklist_items
  where template_id = v_template and is_required;

  if v_required = 0 then
    return true;
  end if;

  select count(*) into v_done
  from public.work_order_checklist_responses r
  join public.checklist_items i on i.id = r.item_id
  where r.work_order_id = p_wo
    and i.template_id = v_template
    and i.is_required
    and r.completed;

  return v_done >= v_required;
end;
$$;

-- Gate en_route on checklist (replace transition RPC)
create or replace function private.transition_work_order(p_wo uuid, p_to text, p_note text)
returns public.work_orders
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_wo public.work_orders;
  v_actor public.profiles;
  v_from text;
begin
  v_actor := private.current_profile();
  if v_actor.id is null then
    raise exception 'Forbidden' using errcode = '42501', detail = 'FORBIDDEN';
  end if;

  select * into v_wo from public.work_orders where id = p_wo for update;
  if not found then
    raise exception 'Work order not found' using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;

  if not private.work_order_visible(v_wo) then
    raise exception 'Forbidden' using errcode = '42501', detail = 'FORBIDDEN';
  end if;

  if v_actor.role = 'technician' and v_wo.assigned_technician_id is distinct from v_actor.id then
    raise exception 'Not the assignee' using errcode = '42501', detail = 'NOT_ASSIGNEE';
  end if;

  if not private.is_staff() and v_actor.role <> 'technician' then
    raise exception 'Forbidden' using errcode = '42501', detail = 'FORBIDDEN';
  end if;

  v_from := v_wo.status;
  if not private.can_transition(v_from, p_to) then
    raise exception 'Cannot go from % to %', v_from, p_to
      using errcode = '22023', detail = 'ILLEGAL_TRANSITION';
  end if;

  if p_to = 'en_route' and not private.checklist_complete_for_wo(p_wo) then
    raise exception 'Safety checklist incomplete'
      using errcode = '22023', detail = 'CHECKLIST_INCOMPLETE';
  end if;

  if p_to = 'completed' and (p_note is null or length(trim(p_note)) = 0) then
    raise exception 'Completion note required' using errcode = '22023', detail = 'VALIDATION';
  end if;

  update public.work_orders
  set status = p_to,
      actual_start = case
        when p_to in ('en_route', 'on_site', 'in_progress') and actual_start is null then pg_catalog.now()
        else actual_start
      end,
      actual_end = case
        when p_to in ('completed', 'cancelled') then pg_catalog.now()
        else actual_end
      end
  where id = p_wo
  returning * into v_wo;

  insert into public.work_order_events (
    org_id, work_order_id, actor_id, event_type, from_status, to_status, payload
  ) values (
    v_wo.org_id, v_wo.id, v_actor.id, 'status_changed', v_from, p_to, '{}'::jsonb
  );

  if p_note is not null and length(trim(p_note)) > 0 then
    insert into public.work_order_notes (org_id, work_order_id, author_id, body)
    values (v_wo.org_id, v_wo.id, v_actor.id, trim(p_note));
    insert into public.work_order_events (
      org_id, work_order_id, actor_id, event_type, payload
    ) values (
      v_wo.org_id, v_wo.id, v_actor.id, 'note', jsonb_build_object('preview', left(trim(p_note), 80))
    );
  end if;

  perform private.sync_presence_for_transition(v_wo.assigned_technician_id, v_wo.id, p_to);

  if p_to = 'accepted' then
    perform private.notify_profile(
      v_wo.org_id, v_wo.created_by, 'job_accepted', 'Job accepted',
      v_wo.number || ' accepted', v_wo.id
    );
  elsif p_to = 'completed' then
    perform private.notify_profile(
      v_wo.org_id, v_wo.created_by, 'job_completed', 'Job completed',
      v_wo.number || ' completed', v_wo.id
    );
  elsif p_to = 'cancelled' then
    if v_wo.assigned_technician_id is not null then
      perform private.notify_profile(
        v_wo.org_id, v_wo.assigned_technician_id, 'job_cancelled', 'Job cancelled',
        v_wo.number || ' cancelled', v_wo.id
      );
    end if;
    perform private.write_audit(
      v_wo.org_id, 'cancel', 'work_order', v_wo.id, jsonb_build_object('from', v_from)
    );
  end if;

  return v_wo;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.checklist_templates enable row level security;
alter table public.checklist_items enable row level security;
alter table public.work_order_checklist_responses enable row level security;
alter table public.work_order_messages enable row level security;
alter table public.technician_location_pings enable row level security;

grant select on public.checklist_templates to authenticated;
grant select on public.checklist_items to authenticated;
grant select, insert, update on public.work_order_checklist_responses to authenticated;
grant select, insert on public.work_order_messages to authenticated;
grant select, insert on public.technician_location_pings to authenticated;

grant insert, update, delete on public.checklist_templates to authenticated;
grant insert, update, delete on public.checklist_items to authenticated;

drop policy if exists checklist_templates_select on public.checklist_templates;
create policy checklist_templates_select
on public.checklist_templates for select to authenticated
using ((select private.same_org(org_id)));

drop policy if exists checklist_templates_admin_write on public.checklist_templates;
create policy checklist_templates_admin_write
on public.checklist_templates for all to authenticated
using ((select private.is_admin()) and (select private.same_org(org_id)))
with check ((select private.is_admin()) and (select private.same_org(org_id)));

drop policy if exists checklist_items_select on public.checklist_items;
create policy checklist_items_select
on public.checklist_items for select to authenticated
using ((select private.same_org(org_id)));

drop policy if exists checklist_items_admin_write on public.checklist_items;
create policy checklist_items_admin_write
on public.checklist_items for all to authenticated
using ((select private.is_admin()) and (select private.same_org(org_id)))
with check ((select private.is_admin()) and (select private.same_org(org_id)));

drop policy if exists checklist_responses_select on public.work_order_checklist_responses;
create policy checklist_responses_select
on public.work_order_checklist_responses for select to authenticated
using (
  exists (
    select 1 from public.work_orders w
    where w.id = work_order_id and (select private.work_order_visible(w))
  )
);

drop policy if exists checklist_responses_write on public.work_order_checklist_responses;
create policy checklist_responses_write
on public.work_order_checklist_responses for insert to authenticated
with check (
  exists (
    select 1 from public.work_orders w
    where w.id = work_order_id
      and (select private.work_order_visible(w))
      and (
        (select private.is_staff())
        or w.assigned_technician_id = (select auth.uid())
      )
  )
);

drop policy if exists checklist_responses_update on public.work_order_checklist_responses;
create policy checklist_responses_update
on public.work_order_checklist_responses for update to authenticated
using (
  exists (
    select 1 from public.work_orders w
    where w.id = work_order_id
      and (select private.work_order_visible(w))
      and (
        (select private.is_staff())
        or w.assigned_technician_id = (select auth.uid())
      )
  )
);

drop policy if exists work_order_messages_select on public.work_order_messages;
create policy work_order_messages_select
on public.work_order_messages for select to authenticated
using (
  exists (
    select 1 from public.work_orders w
    where w.id = work_order_id and (select private.work_order_visible(w))
  )
);

drop policy if exists work_order_messages_insert on public.work_order_messages;
create policy work_order_messages_insert
on public.work_order_messages for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.work_orders w
    where w.id = work_order_id and (select private.work_order_visible(w))
  )
);

drop policy if exists location_pings_select_self on public.technician_location_pings;
create policy location_pings_select_self
on public.technician_location_pings for select to authenticated
using (
  profile_id = (select auth.uid())
  or (
    (select private.is_staff())
    and (select private.same_org(org_id))
  )
);

drop policy if exists location_pings_insert_self on public.technician_location_pings;
create policy location_pings_insert_self
on public.technician_location_pings for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.location_sharing_opt_in
  )
);

-- Realtime (idempotent — will no-op if already added)
do $$ begin
  alter publication supabase_realtime add table public.work_order_messages;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.technician_location_pings;
exception when duplicate_object then null;
end $$;

revoke all on function private.checklist_complete_for_wo(uuid) from public, anon, authenticated;
