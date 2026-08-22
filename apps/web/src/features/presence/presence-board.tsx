"use client"

import { PRESENCE_COLUMNS } from "@crewpulse/domain"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Suspense, memo, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useHeartbeat } from "@/features/presence/use-heartbeat"
import { Toggle } from "@/shared/ui/toggle"
import { AssignSheet } from "@/features/work-orders/assign-sheet"
import { apiFetch, ApiError } from "@/lib/api-client"
import type {
  AssignableTechnician,
  BoardPayload,
  BoardTechnician,
  BoardWorkOrder,
  TeamOption,
} from "@/lib/types"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/shared/ui/button"
import {
  formatRelativeTime,
  OverdueChip,
  PriorityChip,
  StatusChip,
  teamBarClass,
  formatDueAt,
} from "@/shared/ui/status-chip"
import { EmptyState, ErrorState } from "@/shared/ui/feedback"
import { cn } from "@/lib/cn"
import { useUrlFilters } from "@/shared/hooks/use-url-filters"

type BoardFilters = {
  team: string
  status: string
  priority: string
  overdue: string
}

type BoardTab = "technicians" | "work-orders"

function PresenceBoardInner({ tab }: { tab: BoardTab }) {
  useHeartbeat(true)
  const queryClient = useQueryClient()
  const { filters, setFilter } = useUrlFilters()
  const [assignWoId, setAssignWoId] = useState<string | null>(null)

  const boardQuery = useQuery({
    queryKey: ["board"],
    queryFn: () => apiFetch<BoardPayload>("/api/v1/board"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiFetch<TeamOption[]>("/api/v1/teams"),
  })

  const techniciansQuery = useQuery({
    queryKey: ["technicians"],
    queryFn: () => apiFetch<AssignableTechnician[]>("/api/v1/technicians"),
    enabled: assignWoId !== null,
  })

  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const invalidateBoard = () => {
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }
      invalidateTimer.current = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["board"] })
      }, 400)
    }
    const channel = supabase
      .channel("board-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "technician_presence" },
        invalidateBoard,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_orders" },
        invalidateBoard,
      )
      .subscribe()

    return () => {
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }
      void supabase.removeChannel(channel)
    }
  }, [queryClient])

  const assignMutation = useMutation({
    mutationFn: ({
      workOrderId,
      technicianId,
    }: {
      workOrderId: string
      technicianId: string
    }) =>
      apiFetch(`/api/v1/work-orders/${workOrderId}/assign`, {
        method: "POST",
        body: JSON.stringify({ technicianId }),
      }),
    onSuccess: () => {
      toast.success("Work order assigned")
      setAssignWoId(null)
      void queryClient.invalidateQueries({ queryKey: ["board"] })
    },
    onError: (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : "Assign failed")
    },
  })

  const technicians = boardQuery.data?.technicians ?? []
  const workOrders = boardQuery.data?.work_orders ?? []

  const filteredTechs = useMemo(() => {
    return technicians.filter((t) => {
      if (filters.team && t.teamId !== filters.team) return false
      if (filters.status && t.presence !== filters.status) return false
      return true
    })
  }, [technicians, filters.team, filters.status])

  const filteredOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      if (filters.team && wo.teamId !== filters.team) return false
      if (filters.status && wo.status !== filters.status) return false
      if (filters.priority && wo.priority !== filters.priority) return false
      if (filters.overdue === "true" && !wo.overdue) return false
      return true
    })
  }, [workOrders, filters])

  const techsByPresence = useMemo(() => {
    const map = new Map<string, BoardTechnician[]>()
    for (const column of PRESENCE_COLUMNS) {
      map.set(column, [])
    }
    for (const tech of filteredTechs) {
      const list = map.get(tech.presence)
      if (list) {
        list.push(tech)
      }
    }
    return map
  }, [filteredTechs])

  const assignTarget = workOrders.find((wo) => wo.id === assignWoId) ?? null

  const updateFilter = (key: keyof BoardFilters, value: string) => {
    setFilter(key, value)
  }

  if (boardQuery.isLoading) {
    return <BoardSkeleton />
  }

  if (boardQuery.isError) {
    return (
      <ErrorState
        message="Could not load the board."
        onRetry={() => void boardQuery.refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-[6px] border border-border bg-surface/60 px-4 py-3 text-sm text-text-muted">
        Status updates live. Assign from a technician card or from a work order.
      </div>

      <BoardFiltersBar
        filters={filters}
        teams={teamsQuery.data ?? []}
        onChange={updateFilter}
      />

      {tab === "technicians" ? (
        <section aria-live="polite" aria-label="Technician presence">
          <h2 className="mb-4 text-base font-semibold text-text">Technicians</h2>
          <div className="grid gap-4 xl:grid-cols-5">
            {PRESENCE_COLUMNS.map((column) => (
              <PresenceColumn
                key={column}
                title={column.replace("_", " ")}
                technicians={techsByPresence.get(column) ?? []}
              />
            ))}
          </div>
        </section>
      ) : (
        <section aria-label="Work orders">
          <h2 className="mb-4 text-base font-semibold text-text">Work orders</h2>
          {filteredOrders.length === 0 ? (
            <EmptyState message="No work orders match these filters." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredOrders.map((wo) => (
                <WorkOrderCard
                  key={wo.id}
                  workOrder={wo}
                  onAssign={() => setAssignWoId(wo.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {assignTarget ? (
        <AssignSheet
          workOrder={assignTarget}
          technicians={techniciansQuery.data ?? []}
          pending={assignMutation.isPending}
          onClose={() => setAssignWoId(null)}
          onAssign={(technicianId) =>
            assignMutation.mutate({
              workOrderId: assignTarget.id,
              technicianId,
            })
          }
        />
      ) : null}
    </div>
  )
}

export type { BoardTab }

export function PresenceBoardShell({ tab }: { tab: BoardTab }) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <PresenceBoardInner tab={tab} />
    </Suspense>
  )
}

function BoardFiltersBar({
  filters,
  teams,
  onChange,
}: {
  filters: BoardFilters
  teams: TeamOption[]
  onChange: (key: keyof BoardFilters, value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <FilterSelect
        label="Team"
        value={filters.team}
        onChange={(v) => onChange("team", v)}
        options={[
          { value: "", label: "All teams" },
          ...teams.map((t) => ({ value: t.id, label: t.name })),
        ]}
      />
      <FilterSelect
        label="Presence"
        value={filters.status}
        onChange={(v) => onChange("status", v)}
        options={[
          { value: "", label: "All statuses" },
          ...PRESENCE_COLUMNS.map((s) => ({ value: s, label: s.replace("_", " ") })),
        ]}
      />
      <FilterSelect
        label="Priority"
        value={filters.priority}
        onChange={(v) => onChange("priority", v)}
        options={[
          { value: "", label: "All priorities" },
          { value: "critical", label: "Critical" },
          { value: "high", label: "High" },
          { value: "medium", label: "Medium" },
          { value: "low", label: "Low" },
        ]}
      />
      <Toggle
        size="sm"
        checked={filters.overdue === "true"}
        onChange={(v) => onChange("overdue", v ? "true" : "")}
        label="Overdue"
      />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex items-center gap-2 text-xs uppercase tracking-[0.04em] text-text-muted">
      {label}
      <select
        className="h-8 rounded-[4px] border border-border bg-bg px-2 text-sm normal-case tracking-normal text-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function PresenceColumn({
  title,
  technicians,
}: {
  title: string
  technicians: BoardTechnician[]
}) {
  return (
    <div className="min-w-0">
      <p className="caption mb-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
        {title} ({technicians.length})
      </p>
      <div className="flex flex-col gap-3">
        {technicians.length === 0 ? (
          <p className="text-xs text-text-muted">—</p>
        ) : (
          technicians.map((tech) => <TechnicianCard key={tech.id} tech={tech} />)
        )}
      </div>
    </div>
  )
}

const TechnicianCard = memo(function TechnicianCard({ tech }: { tech: BoardTechnician }) {
  return (
    <article className="rounded-[6px] border border-border bg-surface p-3">
      <div className="flex items-start gap-2">
        <span
          className={cn("mt-1 h-8 w-1 shrink-0 rounded-full", teamBarClass(tech.teamColor))}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-text">{tech.fullName}</p>
          <p className="text-xs text-text-muted">{tech.teamName ?? "Unassigned team"}</p>
          <div className="mt-2">
            <StatusChip status={tech.presence} live />
          </div>
          <p className="mt-2 font-mono text-xs text-text-muted">
            Last seen {formatRelativeTime(tech.lastSeenAt)}
          </p>
          {tech.currentWorkOrder ? (
            <p className="mt-2 truncate text-xs">
              <span className="font-mono text-primary">{tech.currentWorkOrder.number}</span>
              {" · "}
              {tech.currentWorkOrder.title}
            </p>
          ) : null}
          {tech.skills.length > 0 ? (
            <p className="mt-2 text-xs text-text-muted">{tech.skills.join(" · ")}</p>
          ) : null}
        </div>
      </div>
    </article>
  )
})

const WorkOrderCard = memo(function WorkOrderCard({
  workOrder,
  onAssign,
}: {
  workOrder: BoardWorkOrder
  onAssign: () => void
}) {
  return (
    <article
      className={cn(
        "rounded-[6px] border bg-surface p-4",
        workOrder.overdue ? "border-[var(--red-alert)]/60" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs text-primary">{workOrder.number}</p>
          <h3 className="mt-1 truncate font-medium text-text">{workOrder.title}</h3>
        </div>
        <PriorityChip priority={workOrder.priority} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusChip status={workOrder.status} />
        {workOrder.overdue ? <OverdueChip /> : null}
      </div>
      {workOrder.dueAt ? (
        <p className="mt-2 font-mono text-xs text-text-muted">
          Due {formatDueAt(workOrder.dueAt)}
        </p>
      ) : null}
      <p className="mt-3 truncate text-xs text-text-muted">{workOrder.siteAddress}</p>
      <p className="mt-1 text-xs text-text-muted">
        {workOrder.assignedName
          ? `Assigned · ${workOrder.assignedName}`
          : "Unassigned"}
      </p>
      {(workOrder.status === "queued" || workOrder.status === "draft") && (
        <Button className="mt-4 w-full" variant="primary" onClick={onAssign}>
          Assign
        </Button>
      )}
    </article>
  )
})

function BoardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3" aria-busy="true" aria-label="Loading board">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-[6px] border border-border bg-surface"
        />
      ))}
    </div>
  )
}
