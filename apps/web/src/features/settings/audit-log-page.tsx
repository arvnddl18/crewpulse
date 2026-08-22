"use client"

import { useQuery } from "@tanstack/react-query"
import { useMe } from "@/features/auth/use-me"
import { apiFetch } from "@/lib/api-client"
import type { AuditLogRow } from "@/lib/types"
import { ErrorState } from "@/shared/ui/feedback"
import { formatRelativeTime } from "@/shared/ui/status-chip"

export function AuditLogPageShell() {
  const { data: me } = useMe()
  const logsQuery = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiFetch<AuditLogRow[]>("/api/v1/audit-logs"),
    enabled: me?.role === "admin",
  })

  if (me && me.role !== "admin") {
    return (
      <p className="text-sm text-text-muted">Admin access required to view audit logs.</p>
    )
  }

  if (logsQuery.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading audit logs">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-[6px] border border-border bg-surface"
          />
        ))}
      </div>
    )
  }

  if (logsQuery.isError) {
    return (
      <ErrorState
        message="Could not load audit logs."
        onRetry={() => void logsQuery.refetch()}
      />
    )
  }

  const logs = logsQuery.data ?? []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-text-muted">
          Assignments, cancellations, and admin actions in your organization.
        </p>
      </header>

      {logs.length === 0 ? (
        <p className="text-sm text-text-muted">No audit entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-[6px] border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-surface/80 text-xs uppercase tracking-[0.04em] text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">
                    {formatRelativeTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">{log.actorName ?? "System"}</td>
                  <td className="px-4 py-3 capitalize">{log.action.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize">{log.entity.replace("_", " ")}</span>
                    {log.entityId ? (
                      <span className="mt-0.5 block font-mono text-xs text-text-muted">
                        {log.entityId.slice(0, 8)}…
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-text-muted">
                    {Object.keys(log.metadata).length > 0
                      ? JSON.stringify(log.metadata)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
