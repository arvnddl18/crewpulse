import { TechnicianJobsShell } from "@/features/work-orders/technician-jobs"
import { RequireAuth, TechnicianShell } from "@/shared/layouts/app-shell"

export default function JobsPage() {
  return (
    <RequireAuth allowed="technician">
      <TechnicianShell>
        <TechnicianJobsShell />
      </TechnicianShell>
    </RequireAuth>
  )
}
