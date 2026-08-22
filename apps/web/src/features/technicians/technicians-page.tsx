"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useMe } from "@/features/auth/use-me"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { AssignableTechnician } from "@/lib/types"
import { StatusChip } from "@/shared/ui/status-chip"
import { Button } from "@/shared/ui/button"

type ProfileRow = {
  id: string
  fullName: string
  email: string
  phone: string | null
  role: string
  isActive: boolean
}

export function TechniciansPageShell() {
  const { data: me } = useMe()
  const queryClient = useQueryClient()

  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: () => apiFetch<ProfileRow[]>("/api/v1/profiles"),
  })

  const techPresenceQuery = useQuery({
    queryKey: ["technicians"],
    queryFn: () => apiFetch<AssignableTechnician[]>("/api/v1/technicians"),
  })

  const patchMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: { role?: string; is_active?: boolean }
    }) =>
      apiFetch(`/api/v1/profiles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("Profile updated")
      void queryClient.invalidateQueries({ queryKey: ["profiles"] })
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : "Update failed"),
  })

  const technicians = (profilesQuery.data ?? []).filter((p) => p.role === "technician")
  const presenceById = new Map(
    (techPresenceQuery.data ?? []).map((t) => [t.id, t]),
  )

  if (profilesQuery.isLoading) {
    return <div className="h-32 animate-pulse rounded-[6px] border border-border bg-surface" />
  }

  return (
    <div className="overflow-x-auto rounded-[6px] border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-border bg-bg-muted text-left">
          <tr>
            <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
              Name
            </th>
            <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
              Email
            </th>
            <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
              Presence
            </th>
            <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
              Skills
            </th>
            {me?.role === "admin" ? (
              <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                Admin
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {technicians.map((tech) => {
            const pres = presenceById.get(tech.id)
            return (
              <tr key={tech.id} className="border-b border-border">
                <td className="px-3 py-3 font-medium">
                  {tech.fullName}
                  {!tech.isActive ? (
                    <span className="ml-2 text-xs text-danger">Inactive</span>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-mono text-xs">{tech.email}</td>
                <td className="px-3 py-3">
                  {pres ? (
                    <StatusChip
                      status={
                        pres.presence as
                          | "offline"
                          | "available"
                          | "on_break"
                          | "en_route"
                          | "on_site"
                      }
                      live
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3 text-text-muted">
                  {pres?.skills.join(" · ") ?? "—"}
                </td>
                {me?.role === "admin" ? (
                  <td className="px-3 py-3">
                    <Button
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() =>
                        patchMutation.mutate({
                          id: tech.id,
                          body: { is_active: !tech.isActive },
                        })
                      }
                    >
                      {tech.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
