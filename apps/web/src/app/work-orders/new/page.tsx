import { CreateWorkOrderForm } from "@/features/work-orders/create-work-order-form"
import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"

export default function NewWorkOrderPage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">New work order</h1>
          <p className="mt-1 text-sm text-text-muted">
            Creates a queued job. Assign from the board or detail page.
          </p>
        </div>
        <CreateWorkOrderForm />
      </StaffShell>
    </RequireAuth>
  )
}
