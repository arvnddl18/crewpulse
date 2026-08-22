"use client"

import { useMe } from "@/features/auth/use-me"
import { isStaffRole } from "@crewpulse/domain"
import { RequireAuth, StaffShell, TechnicianShell } from "@/shared/layouts/app-shell"
import { MessagesPageShell } from "@/features/messages/messages-page"

export default function MessagesPage() {
  return (
    <RequireAuth allowed="any">
      <MessagesInner />
    </RequireAuth>
  )
}

function MessagesInner() {
  const { data: me } = useMe()
  if (!me) return null
  const Shell = isStaffRole(me.role) ? StaffShell : TechnicianShell
  return (
    <Shell>
      <MessagesPageShell />
    </Shell>
  )
}
