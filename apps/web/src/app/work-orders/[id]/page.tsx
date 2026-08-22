import { StaffWorkOrderDetailShell } from "@/features/work-orders/staff-work-orders"
import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"

export default function WorkOrderDetailPage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <StaffWorkOrderDetailShell />
      </StaffShell>
    </RequireAuth>
  )
}
