import { TechnicianStatusShell } from "@/features/work-orders/technician-jobs"
import { RequireAuth, TechnicianShell } from "@/shared/layouts/app-shell"

export default function StatusPage() {
  return (
    <RequireAuth allowed="technician">
      <TechnicianShell>
        <TechnicianStatusShell />
      </TechnicianShell>
    </RequireAuth>
  )
}
