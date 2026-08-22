"use client"

import { nextActions, WORK_ORDER_STATUSES, type WorkOrderStatus } from "@crewpulse/domain"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Suspense, useState } from "react"
import { toast } from "sonner"
import { AssignSheet } from "@/features/work-orders/assign-sheet"
import { Toggle } from "@/shared/ui/toggle"
import { JobPhotoGallery } from "@/features/work-orders/job-photo-gallery"
import { JobChatPanel } from "@/features/field-ops/job-chat"
import { ChecklistStatusBadge } from "@/features/field-ops/safety-checklist"
import { apiFetch, ApiError } from "@/lib/api-client"
import type {
  AssignableTechnician,
  SkillOption,
  TeamOption,
  WorkOrderDetail,
  WorkOrderListItem,
} from "@/lib/types"
import { useUrlFilters } from "@/shared/hooks/use-url-filters"
import { Button } from "@/shared/ui/button"
import { EmptyState, ErrorState, Skeleton } from "@/shared/ui/feedback"
import { PriorityChip, StatusChip, OverdueChip, formatDueAt } from "@/shared/ui/status-chip"

function WorkOrdersListInner() {
  const { filters, setFilter } = useUrlFilters()
  const [searchDraft, setSearchDraft] = useState(filters.q)
  const params = new URLSearchParams()
  if (filters.team) params.set("team", filters.team)
  if (filters.status) params.set("status", filters.status)
  if (filters.priority) params.set("priority", filters.priority)
  if (filters.q) params.set("q", filters.q)
  if (filters.overdue === "true") params.set("overdue", "true")
  const qs = params.toString()

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiFetch<TeamOption[]>("/api/v1/teams"),
  })

  const listQuery = useQuery({
    queryKey: ["work-orders", filters],
    queryFn: () =>
      apiFetch<WorkOrderListItem[]>(`/api/v1/work-orders${qs ? `?${qs}` : ""}`),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setFilter("q", searchDraft.trim())
            }}
          >
            <label className="sr-only" htmlFor="wo-search">
              Search work orders
            </label>
            <input
              id="wo-search"
              type="search"
              placeholder="Search ID, title, site…"
              className="h-8 w-48 rounded-[4px] border border-border bg-bg px-2 text-sm text-text sm:w-56"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
            <Button type="submit" variant="secondary" className="h-8 px-3 text-xs">
              Search
            </Button>
          </form>
          <FilterSelect
            label="Team"
            value={filters.team}
            onChange={(v) => setFilter("team", v)}
            options={[
              { value: "", label: "All teams" },
              ...(teamsQuery.data ?? []).map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => setFilter("status", v)}
            options={[
              { value: "", label: "All statuses" },
              ...WORK_ORDER_STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") })),
            ]}
          />
          <FilterSelect
            label="Priority"
            value={filters.priority}
            onChange={(v) => setFilter("priority", v)}
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
            onChange={(v) => setFilter("overdue", v ? "true" : "")}
            label="Overdue only"
          />
        </div>
        <Link href="/work-orders/new">
          <Button variant="primary">New work order</Button>
        </Link>
      </div>

      {listQuery.isLoading ? (
        <ListSkeleton />
      ) : listQuery.isError ? (
        <ErrorState
          message="Could not load work orders."
          onRetry={() => void listQuery.refetch()}
        />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState message="No work orders match these filters." />
      ) : (
        <div className="overflow-x-auto rounded-[6px] border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-bg-muted text-left">
              <tr>
                <th className="caption px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  ID
                </th>
                <th className="caption px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  Title
                </th>
                <th className="caption px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  Skillset
                </th>
                <th className="caption px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  Status
                </th>
                <th className="caption px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  Priority
                </th>
                <th className="caption px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  Slot / Due
                </th>
                <th className="caption px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  Site
                </th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((wo) => (
                <tr
                  key={wo.id}
                  className="border-b border-border transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <td className="px-3 py-3 font-mono text-xs">
                    <Link href={`/work-orders/${wo.id}`} className="text-primary hover:underline">
                      {wo.number}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{wo.title}</td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-medium text-text">
                      {wo.workOrderType ?? "—"}
                      {wo.orderActionType ? (
                        <span className="ml-1 text-text-muted">({wo.orderActionType})</span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip status={wo.status} />
                  </td>
                  <td className="px-3 py-3">
                    <PriorityChip priority={wo.priority} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs text-text-muted">
                        {formatSlotOrDue(wo.scheduledStart, wo.dueAt)}
                      </span>
                      {wo.overdue ? <OverdueChip /> : null}
                    </div>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-3 text-text-muted">
                    {wo.siteAddress}
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

export function WorkOrdersListShell() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <WorkOrdersListInner />
    </Suspense>
  )
}

export function StaffWorkOrderDetailShell() {
  const params = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [assignOpen, setAssignOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editSite, setEditSite] = useState("")

  const detailQuery = useQuery({
    queryKey: ["work-order", params.id],
    queryFn: () => apiFetch<WorkOrderDetail>(`/api/v1/work-orders/${params.id}`),
  })

  const techniciansQuery = useQuery({
    queryKey: ["technicians"],
    queryFn: () => apiFetch<AssignableTechnician[]>("/api/v1/technicians"),
    enabled: assignOpen,
  })

  const skillsQuery = useQuery({
    queryKey: ["skills"],
    queryFn: () => apiFetch<SkillOption[]>("/api/v1/skills"),
  })

  const assignMutation = useMutation({
    mutationFn: (technicianId: string) =>
      apiFetch(`/api/v1/work-orders/${params.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ technicianId }),
      }),
    onSuccess: () => {
      toast.success("Assigned")
      setAssignOpen(false)
      void queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
      void queryClient.invalidateQueries({ queryKey: ["board"] })
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : "Assign failed"),
  })

  const transitionMutation = useMutation({
    mutationFn: (to: WorkOrderStatus) =>
      apiFetch(`/api/v1/work-orders/${params.id}/transition`, {
        method: "POST",
        body: JSON.stringify({ to }),
      }),
    onSuccess: () => {
      toast.success("Status updated")
      void queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
      void queryClient.invalidateQueries({ queryKey: ["board"] })
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : "Update failed"),
  })

  const patchMutation = useMutation({
    mutationFn: (body: { title: string; site_address: string }) =>
      apiFetch(`/api/v1/work-orders/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("Saved")
      setEditing(false)
      void queryClient.invalidateQueries({ queryKey: ["work-order", params.id] })
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : "Save failed"),
  })

  const wo = detailQuery.data
  if (detailQuery.isError) {
    return (
      <ErrorState
        message="Could not load this work order."
        onRetry={() => void detailQuery.refetch()}
      />
    )
  }
  if (detailQuery.isLoading || !wo) {
    return <Skeleton className="h-40" />
  }

  const skillName =
    skillsQuery.data?.find((s) => s.id === wo.requiredSkillId)?.name ?? null
  const staffActions = nextActions(wo.status, "dispatcher").filter(
    (a) => a.to === "cancelled" || a.to === "queued",
  )

  function startEdit(): void {
    setEditTitle(wo!.title)
    setEditSite(wo!.siteAddress)
    setEditing(true)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/work-orders" className="text-sm text-text-muted hover:text-text">
        ← Work orders
      </Link>

      <header>
        <p className="font-mono text-xs text-primary">{wo.number}</p>
        {editing ? (
          <div className="mt-2 flex flex-col gap-3">
            <input
              className="h-9 rounded-[4px] border border-border bg-bg px-3 text-lg font-semibold"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <input
              className="h-9 rounded-[4px] border border-border bg-bg px-3 text-sm"
              value={editSite}
              onChange={(e) => setEditSite(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() =>
                  patchMutation.mutate({ title: editTitle, site_address: editSite })
                }
              >
                Save
              </Button>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-semibold">{wo.title}</h1>
            <p className="mt-1 text-sm text-text-muted">{wo.siteAddress}</p>
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip status={wo.status} />
          <PriorityChip priority={wo.priority} />
          {wo.workOrderType ? (
            <span className="inline-flex items-center rounded-[4px] border border-border bg-bg-muted px-2 py-0.5 text-xs font-medium">
              {wo.workOrderType}
              {wo.orderActionType ? ` · ${wo.orderActionType}` : ""}
            </span>
          ) : null}
          {wo.overdue ? <OverdueChip /> : null}
          <ChecklistStatusBadge workOrderId={wo.id} />
        </div>
        {wo.scheduledStart || wo.dueAt ? (
          <p className="mt-2 font-mono text-xs text-text-muted">
            Slot {formatSlotOrDue(wo.scheduledStart, wo.dueAt)}
          </p>
        ) : null}
      </header>

      <section className="rounded-[6px] border border-border bg-surface p-4 text-sm">
        {wo.description ? <p className="whitespace-pre-wrap">{wo.description}</p> : null}
        {wo.customerName ? (
          <p className="mt-3 text-text-muted">
            Customer: {wo.customerName}
            {wo.customerPhone ? ` · ${wo.customerPhone}` : ""}
          </p>
        ) : null}
        {skillName ? <p className="mt-1 text-text-muted">Tech skill: {skillName}</p> : null}
        {wo.workOrderType ? (
          <p className="mt-1 text-text-muted">
            Skillset: {wo.workOrderType}
            {wo.orderActionType ? ` · Action: ${wo.orderActionType}` : ""}
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        {!editing ? (
          <Button variant="secondary" onClick={startEdit}>
            Edit
          </Button>
        ) : null}
        {(wo.status === "queued" || wo.status === "draft") && (
          <Button variant="primary" onClick={() => setAssignOpen(true)}>
            Assign
          </Button>
        )}
        {staffActions.map((a) => (
          <Button
            key={a.to}
            variant={a.kind === "danger" ? "danger" : "secondary"}
            onClick={() => transitionMutation.mutate(a.to)}
          >
            {a.label}
          </Button>
        ))}
      </div>

      <JobPhotoGallery attachments={wo.attachments} />

      <JobChatPanel workOrderId={wo.id} />

      <Timeline wo={wo} />

      {assignOpen ? (
        <AssignSheet
          workOrder={{
            id: wo.id,
            number: wo.number,
            title: wo.title,
            siteAddress: wo.siteAddress,
            requiredSkillName: skillName,
          }}
          technicians={techniciansQuery.data ?? []}
          pending={assignMutation.isPending}
          onClose={() => setAssignOpen(false)}
          onAssign={(id) => assignMutation.mutate(id)}
        />
      ) : null}
    </div>
  )
}

function Timeline({ wo }: { wo: WorkOrderDetail }) {
  const items = [
    ...wo.events.map((e) => ({
      id: e.id,
      at: e.createdAt,
      text:
        e.eventType === "status_changed"
          ? `${e.fromStatus ?? "?"} → ${e.toStatus ?? "?"}`
          : e.eventType,
    })),
    ...wo.notes.map((n) => ({
      id: n.id,
      at: n.createdAt,
      text: n.body,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
        Timeline
      </h2>
      <ol className="flex flex-col gap-3 border-l border-border pl-4">
        {items.map((item) => (
          <li key={item.id} className="relative text-sm">
            <span
              className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary"
              aria-hidden
            />
            <time className="font-mono text-xs text-text-muted">
              {new Date(item.at).toLocaleString()}
            </time>
            <p className="mt-0.5">{item.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function formatSlotOrDue(scheduledStart: string | null, dueAt: string | null): string {
  if (scheduledStart) {
    const start = new Date(scheduledStart)
    if (!Number.isNaN(start.getTime())) {
      const hour = start.getHours()
      const period = hour < 13 ? "AM Slot" : "PM Slot"
      const datePart = start.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
      return `${datePart} ${period}`
    }
  }
  return formatDueAt(dueAt)
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

function ListSkeleton() {
  return <Skeleton className="h-48" />
}
