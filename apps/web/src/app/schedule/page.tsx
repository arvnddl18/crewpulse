import { ScheduleShell } from "@/features/schedule/schedule-page"
import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"

export default function SchedulePage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="mt-1 text-sm text-text-muted">
            Technician shift calendar. Plan who is on shift for the week.
          </p>
        </div>
        <ScheduleShell />
      </StaffShell>
    </RequireAuth>
  )
}
