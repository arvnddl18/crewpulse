-- Phase 1: assign + transition RPCs (status machine)

create or replace function private.work_orders_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.number is null or new.number = '' then
    new.number := private.next_work_order_number();
  end if;
  if new.status is null or new.status = '' then
    new.status := 'queued';
  end if;
  return new;
end;
$$;

create trigger work_orders_before_insert
before insert on public.work_orders
for each row execute function private.work_orders_before_insert();

create or replace function private.work_orders_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.work_order_events (
    org_id, work_order_id, actor_id, event_type, to_status, payload
  ) values (
    new.org_id, new.id, new.created_by, 'created', new.status, '{}'::jsonb
  );
  return new;
end;
$$;

create trigger work_orders_after_insert
after insert on public.work_orders
for each row execute function private.work_orders_after_insert();

create or replace function private.can_transition(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = public, pg_catalog
as $$
  select case
    when p_from = p_to then false
    when p_to = 'cancelled' and p_from not in ('completed', 'cancelled', 'needs_followup') then true
    when p_from = 'draft' and p_to = 'queued' then true
    when p_from = 'queued' and p_to = 'assigned' then true
    when p_from = 'assigned' and p_to = 'accepted' then true
    when p_from = 'accepted' and p_to = 'en_route' then true
    when p_from = 'en_route' and p_to = 'on_site' then true
    when p_from = 'on_site' and p_to = 'in_progress' then true
    when p_from = 'in_progress' and p_to in ('paused', 'completed') then true
    when p_from = 'paused' and p_to = 'in_progress' then true
    when p_from = 'completed' and p_to = 'needs_followup' then true
    else false
  end
$$;

create or replace function private.write_audit(
  p_org uuid,
  p_action text,
  p_entity text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.audit_logs (org_id, actor_id, action, entity, entity_id, metadata)
  values (p_org, (select auth.uid()), p_action, p_entity, p_entity_id, p_metadata);
end;
$$;

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
begin
  insert into public.notifications (org_id, profile_id, type, title, body, work_order_id)
  values (p_org, p_profile, p_type, p_title, p_body, p_work_order);
end;
$$;

create or replace function private.sync_presence_for_transition(
  p_tech uuid,
  p_wo uuid,
  p_to text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_other uuid;
begin
  if p_tech is null then
    return;
  end if;

  if p_to in ('en_route') then
    update public.technician_presence
    set status = 'en_route',
        current_work_order_id = p_wo,
        last_seen_at = pg_catalog.now()
    where profile_id = p_tech;
  elsif p_to in ('on_site', 'in_progress') then
    update public.technician_presence
    set status = 'on_site',
        current_work_order_id = p_wo,
        last_seen_at = pg_catalog.now()
    where profile_id = p_tech;
  elsif p_to = 'paused' then
    update public.technician_presence
    set status = 'on_break',
        current_work_order_id = p_wo,
        last_seen_at = pg_catalog.now()
    where profile_id = p_tech;
  elsif p_to in ('completed', 'cancelled') then
    select w.id
    into v_other
    from public.work_orders w
    where w.assigned_technician_id = p_tech
      and w.id <> p_wo
      and w.status in ('accepted', 'en_route', 'on_site', 'in_progress', 'paused')
    limit 1;

    update public.technician_presence
    set status = 'available',
        current_work_order_id = v_other,
        last_seen_at = pg_catalog.now()
    where profile_id = p_tech;
  end if;
end;
$$;

create or replace function private.assign_work_order(p_wo uuid, p_tech uuid)
returns public.work_orders
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_wo public.work_orders;
  v_tech public.profiles;
  v_presence public.technician_presence;
  v_actor public.profiles;
  v_event text;
begin
  v_actor := private.current_profile();
  if v_actor.id is null or not private.is_staff() then
    raise exception 'Forbidden' using errcode = '42501', detail = 'FORBIDDEN';
  end if;

  select * into v_wo from public.work_orders where id = p_wo for update;
  if not found then
    raise exception 'Work order not found' using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;

  if not private.same_org(v_wo.org_id) or not private.work_order_visible(v_wo) then
    raise exception 'Forbidden' using errcode = '42501', detail = 'FORBIDDEN';
  end if;

  if v_wo.status in ('completed', 'cancelled') then
    raise exception 'Cannot assign a closed work order'
      using errcode = '22023', detail = 'ILLEGAL_TRANSITION';
  end if;

  select * into v_tech from public.profiles where id = p_tech;
  if not found or v_tech.org_id <> v_wo.org_id or not v_tech.is_active or v_tech.role <> 'technician' then
    raise exception 'Technician is not assignable' using errcode = '22023', detail = 'NOT_ASSIGNEE';
  end if;

  select * into v_presence from public.technician_presence where profile_id = p_tech;
  if v_presence.status is not distinct from 'offline' then
    raise exception 'Technician is offline' using errcode = '22023', detail = 'TECH_OFFLINE';
  end if;

  v_event := case
    when v_wo.assigned_technician_id is not null and v_wo.assigned_technician_id <> p_tech then 'reassigned'
    else 'assigned'
  end;

  update public.work_orders
  set assigned_technician_id = p_tech,
      status = case when status in ('draft', 'queued') then 'assigned' else status end,
      team_id = coalesce(
        work_orders.team_id,
        (
          select tm.team_id
          from public.team_members tm
          where tm.profile_id = p_tech and tm.is_primary
          limit 1
        )
      )
  where id = p_wo
  returning * into v_wo;

  insert into public.work_order_events (
    org_id, work_order_id, actor_id, event_type, to_status, payload
  ) values (
    v_wo.org_id,
    v_wo.id,
    v_actor.id,
    v_event,
    v_wo.status,
    jsonb_build_object('technician_id', p_tech)
  );

  perform private.notify_profile(
    v_wo.org_id,
    p_tech,
    'job_assigned',
    'Job assigned',
    v_wo.number || ' — ' || v_wo.title,
    v_wo.id
  );

  perform private.write_audit(
    v_wo.org_id,
    'assign',
    'work_order',
    v_wo.id,
    jsonb_build_object('technician_id', p_tech)
  );

  return v_wo;
end;
$$;

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
      v_wo.org_id,
      v_wo.created_by,
      'job_accepted',
      'Job accepted',
      v_wo.number || ' accepted',
      v_wo.id
    );
  elsif p_to = 'completed' then
    perform private.notify_profile(
      v_wo.org_id,
      v_wo.created_by,
      'job_completed',
      'Job completed',
      v_wo.number || ' completed',
      v_wo.id
    );
  elsif p_to = 'cancelled' then
    if v_wo.assigned_technician_id is not null then
      perform private.notify_profile(
        v_wo.org_id,
        v_wo.assigned_technician_id,
        'job_cancelled',
        'Job cancelled',
        v_wo.number || ' cancelled',
        v_wo.id
      );
    end if;
    perform private.write_audit(
      v_wo.org_id, 'cancel', 'work_order', v_wo.id, jsonb_build_object('from', v_from)
    );
  end if;

  return v_wo;
end;
$$;

create or replace function public.assign_work_order(p_wo uuid, p_tech uuid)
returns public.work_orders
language sql
security definer
set search_path = public, pg_catalog
as $$
  select * from private.assign_work_order(p_wo, p_tech)
$$;

create or replace function public.transition_work_order(p_wo uuid, p_to text, p_note text default null)
returns public.work_orders
language sql
security definer
set search_path = public, pg_catalog
as $$
  select * from private.transition_work_order(p_wo, p_to, p_note)
$$;

revoke all on function private.assign_work_order(uuid, uuid) from public, anon, authenticated;
revoke all on function private.transition_work_order(uuid, text, text) from public, anon, authenticated;
revoke all on function private.can_transition(text, text) from public, anon, authenticated;
revoke all on function private.write_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.notify_profile(uuid, uuid, text, text, text, uuid) from public, anon, authenticated;

revoke all on function public.assign_work_order(uuid, uuid) from public, anon;
revoke all on function public.transition_work_order(uuid, text, text) from public, anon;
grant execute on function public.assign_work_order(uuid, uuid) to authenticated;
grant execute on function public.transition_work_order(uuid, text, text) to authenticated;
