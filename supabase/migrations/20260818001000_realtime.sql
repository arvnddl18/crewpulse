-- Phase 1: Realtime publication (RLS still applies to payloads)

alter publication supabase_realtime add table public.work_orders;
alter publication supabase_realtime add table public.technician_presence;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.work_order_events;
