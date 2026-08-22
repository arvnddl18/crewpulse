-- Phase 1 addendum: broadband work order classification
-- Matches CRM/BSS skillset (work_order_type) and orderactiontype (order_action_type)

alter table work_orders
  add column if not exists work_order_type   text check (work_order_type in ('Repair', 'Install', 'Migration', 'Dedicated Migration')),
  add column if not exists order_action_type text check (order_action_type in ('PR', 'PV', 'CH'));

comment on column work_orders.work_order_type   is 'Broadband job category: Repair | Install | Migration. Matches CRM/BSS skillset column.';
comment on column work_orders.order_action_type is 'Install sub-type: PR=Provisioning PV=Pre-visit CH=Change. Null for Repair/Migration.';

create index if not exists idx_work_orders_type on work_orders (org_id, work_order_type);
