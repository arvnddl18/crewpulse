import { SlotAdherenceShell } from "@/features/reports/slot-adherence-page"
import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"

export default function SlotAdherencePage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Slot adherence</h1>
          <p className="mt-1 text-sm text-text-muted">
            Upload CRM/BSS all-status Excel. View in-slot rate, aging, and drill-down.
          </p>
        </div>
        <SlotAdherenceShell />
      </StaffShell>
    </RequireAuth>
  )
}
