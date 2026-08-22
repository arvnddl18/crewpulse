-- Allow any authenticated user in the same org to see basic profile info
-- (needed for chat contacts list). The existing policy only lets technicians
-- see themselves; staff can already see all.
-- This policy is additive (OR) with the existing profiles_select policy.

create policy profiles_select_same_org
on public.profiles
for select
to authenticated
using (
  (select private.same_org(org_id))
);
