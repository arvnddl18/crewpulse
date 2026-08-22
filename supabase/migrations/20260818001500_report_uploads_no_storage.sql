-- Phase 2: do not retain raw Excel in Storage; one parsed snapshot per org

alter table public.report_uploads drop column if exists storage_path;

drop policy if exists report_uploads_storage_select on storage.objects;
drop policy if exists report_uploads_storage_insert on storage.objects;
drop policy if exists report_uploads_storage_delete on storage.objects;

delete from storage.buckets where id = 'report-uploads';

drop policy if exists report_uploads_delete_admin on public.report_uploads;

create policy report_uploads_delete_staff
on public.report_uploads for delete to authenticated
using ((select private.is_staff()) and (select private.same_org(org_id)));
