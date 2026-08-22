import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"
import { InteractiveMapShell } from "@/features/field-ops/interactive-map"

export default function MapPage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <InteractiveMapShell />
      </StaffShell>
    </RequireAuth>
  )
}
