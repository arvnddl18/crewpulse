import { TechniciansPageShell } from "@/features/technicians/technicians-page"
import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"

export default function TechniciansPage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Technicians</h1>
          <p className="mt-1 text-sm text-text-muted">
            Field roster, presence, and skills.
          </p>
        </div>
        <TechniciansPageShell />
      </StaffShell>
    </RequireAuth>
  )
}
