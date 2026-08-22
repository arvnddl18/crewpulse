"use client"

import { SettingsPageShell } from "@/features/settings/settings-page"
import { RequireAuth, TechnicianShell } from "@/shared/layouts/app-shell"

export default function AccountPage() {
  return (
    <RequireAuth allowed="technician">
      <TechnicianShell>
        <SettingsPageShell />
      </TechnicianShell>
    </RequireAuth>
  )
}
