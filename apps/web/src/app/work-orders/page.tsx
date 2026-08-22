import { WorkOrdersListShell } from "@/features/work-orders/staff-work-orders"
import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"

export default function WorkOrdersPage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Work orders</h1>
          <p className="mt-1 text-sm text-text-muted">
            All jobs in the org. Search, filter, or show overdue only.
          </p>
        </div>
        <WorkOrdersListShell />
      </StaffShell>
    </RequireAuth>
  )
}
