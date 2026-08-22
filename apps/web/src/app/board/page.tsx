import { BoardPageShell } from "@/features/presence/board-page-shell"
import { RequireAuth, StaffShell } from "@/shared/layouts/app-shell"

export default function BoardPage() {
  return (
    <RequireAuth allowed="staff">
      <StaffShell>
        <BoardPageShell />
      </StaffShell>
    </RequireAuth>
  )
}
