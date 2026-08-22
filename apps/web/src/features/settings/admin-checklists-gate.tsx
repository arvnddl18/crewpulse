"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ChecklistsSettingsShell } from "@/features/settings/checklists-page"
import { useMe } from "@/features/auth/use-me"

export function AdminChecklistsGate() {
  const router = useRouter()
  const { data: me, isLoading } = useMe()

  useEffect(() => {
    if (!isLoading && me && me.role !== "admin") {
      router.replace("/settings")
    }
  }, [isLoading, me, router])

  if (isLoading || !me) {
    return <p className="text-sm text-text-muted">Loading…</p>
  }
  if (me.role !== "admin") {
    return null
  }
  return <ChecklistsSettingsShell />
}
