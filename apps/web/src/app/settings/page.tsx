import { SettingsPageShell } from "@/features/settings/settings-page"
import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"

export default function SettingsPage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <SettingsPageShell />
      </StaffShell>
    </RequireAuth>
  )
}
