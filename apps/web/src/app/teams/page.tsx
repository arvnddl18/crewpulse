import { TeamsPageShell } from "@/features/teams/teams-page"
import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"

export default function TeamsPage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-text-muted">Crews and team leads.</p>
        </div>
        <TeamsPageShell />
      </StaffShell>
    </RequireAuth>
  )
}
