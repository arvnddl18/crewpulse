"use client"

import {
  nextActions,
  SETTABLE_PRESENCE,
  type WorkOrderStatus,
} from "@crewpulse/domain"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useMe } from "@/features/auth/use-me"
import { useHeartbeat } from "@/features/presence/use-heartbeat"
import { JobPhotoGallery } from "@/features/work-orders/job-photo-gallery"
import { JobChatPanel } from "@/features/field-ops/job-chat"
import { SafetyChecklistPanel } from "@/features/field-ops/safety-checklist"
import { useLocationStream } from "@/features/field-ops/use-location-stream"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { WorkOrderDetail, WorkOrderListItem } from "@/lib/types"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/shared/ui/button"
import { Toggle } from "@/shared/ui/toggle"
import { EmptyState, ErrorState, Skeleton } from "@/shared/ui/feedback"
import { PriorityChip, StatusChip } from "@/shared/ui/status-chip"
import { cn } from "@/lib/cn"
import { validateJobPhoto } from "@/lib/job-photo"

export function TechnicianJobsShell() {
  useHeartbeat(true)
  const { data: me } = useMe()
  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: () => apiFetch<WorkOrderListItem[]>("/api/v1/jobs"),
    refetchInterval: 20_000,
  })

  const queryClient = useQueryClient()
  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel("jobs-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_orders" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["jobs"] })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])

  const active = (jobsQuery.data ?? []).filter((j) =>
    ["assigned", "accepted", "en_route", "on_site", "in_progress", "paused"].includes(
      j.status,
    ),
  )
  const done = (jobsQuery.data ?? []).filter((j) =>
    ["completed", "cancelled", "needs_followup"].includes(j.status),
  )

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
          My jobs
        </p>
        <h1 className="mt-1 text-2xl font-semibold" data-testid="jobs-heading">
          {me?.fullName ?? "Technician"}
        </h1>
      </header>

      {jobsQuery.isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading jobs">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : jobsQuery.isError ? (
        <ErrorState
          message="Could not load your jobs."
          onRetry={() => void jobsQuery.refetch()}
        />
      ) : active.length === 0 && done.length === 0 ? (
        <EmptyState message="No jobs assigned yet. Check back when dispatch assigns you work." />
      ) : (
        <>
          {active.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
                Active
              </h2>
              <div className="flex flex-col gap-3">
                {active.map((job) => (
                  <JobListCard key={job.id} job={job} />
                ))}
              </div>
            </section>
          ) : null}
          {done.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
                History
              </h2>
              <div className="flex flex-col gap-3 opacity-80">
                {done.map((job) => (
                  <JobListCard key={job.id} job={job} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

function JobListCard({ job }: { job: WorkOrderListItem }) {
  const isActive = ["assigned", "accepted", "en_route", "on_site", "in_progress", "paused"].includes(job.status)

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={cn(
        "block rounded-[6px] border bg-surface p-4 transition-colors hover:bg-[var(--surface-hover)]",
        isActive ? "border-primary/30" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <StatusChip status={job.status} />
        <PriorityChip priority={job.priority} />
      </div>
      <h3 className="mt-3 text-base font-medium leading-snug">{job.title}</h3>
      <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
        <span className="font-mono text-primary">{job.number}</span>
        <span aria-hidden>·</span>
        <span className="truncate">{job.siteAddress}</span>
      </div>
    </Link>
  )
}

export function TechnicianJobDetailShell() {
  useHeartbeat(true)
  const params = useParams<{ id: string }>()
  const jobId = params.id
  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const [note, setNote] = useState("")
  const [conflict, setConflict] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [checklistComplete, setChecklistComplete] = useState(true)

  const detailQuery = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => apiFetch<WorkOrderDetail>(`/api/v1/work-orders/${jobId}`),
    enabled: Boolean(jobId),
  })

  const job = detailQuery.data

  useLocationStream({
    workOrderId: jobId,
    status: job?.status ?? null,
    optedIn: me?.locationSharingOptIn ?? false,
    enabled: Boolean(job && me),
  })

  useEffect(() => {
    if (
      detailQuery.data &&
      me &&
      detailQuery.data.assignedTechnicianId !== null &&
      detailQuery.data.assignedTechnicianId !== me.id
    ) {
      setConflict(true)
    }
  }, [detailQuery.data, me])

  const transitionMutation = useMutation({
    mutationFn: async ({
      to,
      noteText,
      photoFile,
    }: {
      to: WorkOrderStatus
      noteText?: string
      photoFile?: File | null
    }) => {
      if (photoFile) {
        const form = new FormData()
        form.append("file", photoFile)
        const uploadRes = await fetch(`/api/v1/work-orders/${jobId}/attachments`, {
          method: "POST",
          body: form,
          credentials: "same-origin",
        })
        const uploadBody = (await uploadRes.json()) as {
          ok: boolean
          message?: string
        }
        if (!uploadBody.ok) {
          throw new ApiError("VALIDATION", uploadBody.message ?? "Photo upload failed")
        }
      }
      return apiFetch(`/api/v1/work-orders/${jobId}/transition`, {
        method: "POST",
        body: JSON.stringify({ to, note: noteText }),
      })
    },
    onSuccess: () => {
      toast.success("Status updated")
      setNote("")
      setPhoto(null)
      setPhotoError(null)
      void queryClient.invalidateQueries({ queryKey: ["job", jobId] })
      void queryClient.invalidateQueries({ queryKey: ["jobs"] })
      void queryClient.invalidateQueries({ queryKey: ["board"] })
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === "NOT_ASSIGNEE") {
        setConflict(true)
      }
      if (error instanceof ApiError && error.code === "CHECKLIST_INCOMPLETE") {
        toast.error("Complete the safety checklist before going en route")
        return
      }
      toast.error(error instanceof ApiError ? error.message : "Update failed")
    },
  })

  const actions = job ? nextActions(job.status, "technician") : []
  const primary = actions.find((a) => a.kind === "primary" || a.kind === "success")

  if (conflict) {
    return (
      <div className="rounded-[6px] border border-danger/40 bg-surface p-6">
        <h1 className="text-lg font-semibold text-danger">This job is no longer yours.</h1>
        <p className="mt-2 text-sm text-text-muted">
          Dispatch may have reassigned it. Return to your job list.
        </p>
        <Link href="/jobs" className="mt-4 inline-block text-sm text-primary underline">
          Back to jobs
        </Link>
      </div>
    )
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        message="Could not load this job."
        onRetry={() => void detailQuery.refetch()}
      />
    )
  }

  if (detailQuery.isLoading || !job) {
    return <Skeleton className="h-40" />
  }

  const needsNote = primary?.to === "completed"
  const blockedByChecklist =
    primary?.to === "en_route" && !checklistComplete

  return (
    <div className="flex flex-col gap-6 pb-28">
      <Link href="/jobs" className="text-sm text-text-muted hover:text-text">
        ← Jobs
      </Link>

      <header>
        <p className="font-mono text-xs text-primary">{job.number}</p>
        <h1 className="mt-1 text-2xl font-semibold">{job.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip status={job.status} />
          <PriorityChip priority={job.priority} />
        </div>
      </header>

      <section className="rounded-[6px] border border-border bg-surface p-4 text-sm">
        <dl className="flex flex-col gap-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
              Site address
            </dt>
            <dd className="mt-1">{job.siteAddress}</dd>
          </div>
          {job.customerName ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                Customer
              </dt>
              <dd className="mt-1">{job.customerName}</dd>
            </div>
          ) : null}
          {job.description ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                Details
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">{job.description}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {job.status === "accepted" ? (
        <SafetyChecklistPanel
          workOrderId={jobId}
          editable
          onCompleteChange={setChecklistComplete}
        />
      ) : null}

      {needsNote ? (
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Completion note (required)</span>
          <textarea
            className="min-h-[96px] rounded-[4px] border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you do on site?"
            required
          />
        </label>
      ) : null}

      {needsNote ? (
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Photo (optional)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm file:mr-3 file:h-9 file:rounded-[6px] file:border file:border-border file:bg-surface file:px-3 file:text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              if (!file) {
                setPhoto(null)
                setPhotoError(null)
                return
              }
              const checked = validateJobPhoto({ size: file.size, mime: file.type })
              if (!checked.ok) {
                setPhoto(null)
                setPhotoError(checked.message)
                return
              }
              setPhotoError(null)
              setPhoto(file)
            }}
          />
          {photoError ? (
            <span className="text-xs text-danger" role="alert">
              {photoError}
            </span>
          ) : null}
        </label>
      ) : null}

      {primary ? (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-bg-muted/95 px-4 py-3 backdrop-blur-sm md:static md:border-0 md:bg-transparent md:p-0">
          <Button
            variant={primary.kind === "success" ? "success" : "primary"}
            className="h-12 w-full text-base md:h-10 md:w-auto md:min-w-[200px]"
            disabled={transitionMutation.isPending || Boolean(photoError) || blockedByChecklist}
            aria-busy={transitionMutation.isPending}
            title={blockedByChecklist ? "Complete safety checklist first" : undefined}
            onClick={() =>
              transitionMutation.mutate({
                to: primary.to,
                noteText: needsNote ? note : undefined,
                photoFile: needsNote ? photo : null,
              })
            }
          >
            {primary.label}
          </Button>
        </div>
      ) : null}

      {actions.filter((a) => a !== primary).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions
            .filter((a) => a !== primary)
            .map((action) => (
              <Button
                key={action.to}
                variant={action.kind === "danger" ? "danger" : "secondary"}
                disabled={transitionMutation.isPending}
                onClick={() =>
                  transitionMutation.mutate({ to: action.to, noteText: note || undefined })
                }
              >
                {action.label}
              </Button>
            ))}
        </div>
      ) : null}

      <JobPhotoGallery attachments={job.attachments} />

      <JobChatPanel workOrderId={jobId} />

      <Timeline job={job} />
    </div>
  )
}

function Timeline({ job }: { job: WorkOrderDetail }) {
  const items = [
    ...job.events.map((e) => ({
      id: e.id,
      kind: "event" as const,
      at: e.createdAt,
      text:
        e.eventType === "status_changed"
          ? `${e.fromStatus ?? "?"} → ${e.toStatus ?? "?"}`
          : e.eventType,
    })),
    ...job.notes.map((n) => ({
      id: n.id,
      kind: "note" as const,
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
            <p className={cn("mt-0.5", item.kind === "note" && "italic")}>{item.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function TechnicianStatusShell() {
  useHeartbeat(true)
  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const [locationOptIn, setLocationOptIn] = useState(false)

  useEffect(() => {
    if (me) {
      setLocationOptIn(me.locationSharingOptIn)
    }
  }, [me])

  const presenceMutation = useMutation({
    mutationFn: (status: (typeof SETTABLE_PRESENCE)[number]) =>
      apiFetch("/api/v1/presence", {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      toast.success("Status updated")
      void queryClient.invalidateQueries({ queryKey: ["board"] })
    },
    onError: (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : "Update failed")
    },
  })

  const locationMutation = useMutation({
    mutationFn: (optIn: boolean) =>
      apiFetch("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ location_sharing_opt_in: optIn }),
      }),
    onSuccess: () => {
      toast.success("Location preference saved")
      void queryClient.invalidateQueries({ queryKey: ["me"] })
    },
    onError: (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : "Save failed")
    },
  })

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <h1 className="text-2xl font-semibold">Status</h1>
        <p className="mt-1 text-sm text-text-muted">
          Set availability when you are not on an active job.
        </p>
      </header>

      <section className="rounded-[6px] border border-border bg-surface p-4">
        <Toggle
          checked={locationOptIn}
          disabled={locationMutation.isPending}
          onChange={(v) => {
            setLocationOptIn(v)
            locationMutation.mutate(v)
          }}
          label="Share location on active jobs"
          description="Foreground only while a job screen is open. Stops on complete, break, or opt-out."
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
          Set your status
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {SETTABLE_PRESENCE.map((status) => {
            const labels: Record<string, string> = {
              available: "Available",
              on_break: "On Break",
              offline: "Offline",
            }
            const statusColors: Record<string, string> = {
              available: "border-[var(--status-available)] text-[#2DD4BF]",
              on_break: "border-[var(--status-break)] text-[#D4A017]",
              offline: "border-border text-text-muted",
            }
            return (
              <button
                key={status}
                type="button"
                className={cn(
                  "flex h-14 items-center justify-center gap-2 rounded-[6px] border-2 bg-surface text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]",
                  statusColors[status] ?? "border-border",
                )}
                disabled={presenceMutation.isPending}
                onClick={() => presenceMutation.mutate(status)}
              >
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 rounded-full",
                    status === "available" && "bg-[#2DD4BF]",
                    status === "on_break" && "bg-[#D4A017]",
                    status === "offline" && "bg-text-muted",
                  )}
                />
                {labels[status] ?? status.replace("_", " ")}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
