import { AuditLogPageShell } from "@/features/settings/audit-log-page"
import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"

export default function AuditLogPage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <AuditLogPageShell />
      </StaffShell>
    </RequireAuth>
  )
}
