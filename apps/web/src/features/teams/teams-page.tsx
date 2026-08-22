"use client"

import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"
import type { TeamOption } from "@/lib/types"
import { teamBarClass } from "@/shared/ui/status-chip"

type ProfileRow = {
  id: string
  fullName: string
  email: string
  role: string
  isActive: boolean
}

export function TeamsPageShell() {
  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiFetch<TeamOption[]>("/api/v1/teams"),
  })
  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: () => apiFetch<ProfileRow[]>("/api/v1/profiles"),
  })

  if (teamsQuery.isLoading) {
    return <div className="h-32 animate-pulse rounded-[6px] border border-border bg-surface" />
  }

  const profiles = profilesQuery.data ?? []
  const nameById = new Map(profiles.map((p) => [p.id, p.fullName]))

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(teamsQuery.data ?? []).map((team) => (
        <article
          key={team.id}
          className="rounded-[6px] border border-border bg-surface p-4"
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-8 w-1 rounded-full ${teamBarClass(team.color)}`}
              aria-hidden
            />
            <h2 className="text-lg font-semibold">{team.name}</h2>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Lead: {team.leadId ? (nameById.get(team.leadId) ?? "—") : "None"}
          </p>
        </article>
      ))}
    </div>
  )
}
