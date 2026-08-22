import { AdminChecklistsGate } from "@/features/settings/admin-checklists-gate"
import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"

export default function ChecklistsSettingsPage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <AdminChecklistsGate />
      </StaffShell>
    </RequireAuth>
  )
}
