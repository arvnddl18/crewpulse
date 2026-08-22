import { TechnicianJobDetailShell } from "@/features/work-orders/technician-jobs"
import { RequireAuth, TechnicianShell } from "@/shared/layouts/app-shell"

export default function JobDetailPage() {
  return (
    <RequireAuth allowed="technician">
      <TechnicianShell>
        <TechnicianJobDetailShell />
      </TechnicianShell>
    </RequireAuth>
  )
}
