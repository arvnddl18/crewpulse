"use client"

import { checklistProgress } from "@crewpulse/domain"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { WorkOrderChecklistView } from "@/lib/types"
import { validateJobPhoto } from "@/lib/job-photo"
import { cn } from "@/lib/cn"
import { Toggle } from "@/shared/ui/toggle"

export function SafetyChecklistPanel({
  workOrderId,
  editable,
  onCompleteChange,
}: {
  workOrderId: string
  editable: boolean
  onCompleteChange?: (complete: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [photoError, setPhotoError] = useState<string | null>(null)

  const checklistQuery = useQuery({
    queryKey: ["checklist", workOrderId],
    queryFn: () =>
      apiFetch<WorkOrderChecklistView>(`/api/v1/work-orders/${workOrderId}/checklist`),
  })

  const completeMutation = useMutation({
    mutationFn: async ({
      itemId,
      completed,
      photoFile,
    }: {
      itemId: string
      completed: boolean
      photoFile?: File | null
    }) => {
      let attachmentId: string | null = null
      if (photoFile) {
        const form = new FormData()
        form.append("file", photoFile)
        const uploadRes = await fetch(`/api/v1/work-orders/${workOrderId}/attachments`, {
          method: "POST",
          body: form,
          credentials: "same-origin",
        })
        const uploadBody = (await uploadRes.json()) as {
          ok: boolean
          data?: { id: string }
          message?: string
        }
        if (!uploadBody.ok || !uploadBody.data) {
          throw new ApiError("VALIDATION", uploadBody.message ?? "Photo upload failed")
        }
        attachmentId = uploadBody.data.id
      }
      return apiFetch<WorkOrderChecklistView>(`/api/v1/work-orders/${workOrderId}/checklist`, {
        method: "POST",
        body: JSON.stringify({ itemId, completed, attachmentId }),
      })
    },
    onSuccess: (data) => {
      void queryClient.setQueryData(["checklist", workOrderId], data)
      onCompleteChange?.(data.complete)
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : "Could not update checklist"),
  })

  const checklist = checklistQuery.data
  if (checklistQuery.isLoading) {
    return null
  }
  if (!checklist || checklist.items.length === 0) {
    return null
  }

  const progress = checklistProgress(checklist.items)

  return (
    <section className="rounded-[6px] border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
            Safety checklist
          </h2>
          {checklist.templateName ? (
            <p className="mt-0.5 text-xs text-text-muted">{checklist.templateName}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "rounded-[4px] px-2 py-0.5 font-mono text-xs",
            checklist.complete
              ? "bg-success/15 text-success"
              : "bg-warning/15 text-warning",
          )}
        >
          {progress.completed}/{progress.required} required
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {checklist.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 text-sm">
            <Toggle
              size="sm"
              checked={item.completed}
              disabled={!editable || completeMutation.isPending || (item.requiresPhoto && !item.completed)}
              onChange={(v) => {
                if (!v) {
                  completeMutation.mutate({ itemId: item.id, completed: false })
                  return
                }
                if (item.requiresPhoto) return
                completeMutation.mutate({ itemId: item.id, completed: true })
              }}
              label={item.label}
              description={
                [
                  item.isRequired ? "Required" : null,
                  item.requiresPhoto ? "Photo needed" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
            />
            {editable && item.requiresPhoto && !item.completed ? (
              <div className="ml-6">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="text-xs file:mr-2 file:rounded-[4px] file:border file:border-border file:bg-bg file:px-2 file:py-1"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    if (!file) return
                    const checked = validateJobPhoto({ size: file.size, mime: file.type })
                    if (!checked.ok) {
                      setPhotoError(checked.message)
                      return
                    }
                    setPhotoError(null)
                    completeMutation.mutate({
                      itemId: item.id,
                      completed: true,
                      photoFile: file,
                    })
                  }}
                />
                {photoError ? (
                  <p className="mt-1 text-xs text-danger" role="alert">
                    {photoError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {!checklist.complete && editable ? (
        <p className="mt-3 text-xs text-warning">
          Complete all required items before going en route.
        </p>
      ) : null}
    </section>
  )
}

export function ChecklistStatusBadge({ workOrderId }: { workOrderId: string }) {
  const checklistQuery = useQuery({
    queryKey: ["checklist", workOrderId],
    queryFn: () =>
      apiFetch<WorkOrderChecklistView>(`/api/v1/work-orders/${workOrderId}/checklist`),
  })

  const checklist = checklistQuery.data
  if (!checklist || checklist.items.length === 0) {
    return null
  }
  if (checklist.complete) {
    return null
  }

  const progress = checklistProgress(checklist.items)
  return (
    <span className="rounded-[4px] bg-warning/15 px-2 py-0.5 text-xs text-warning">
      Checklist incomplete ({progress.completed}/{progress.required})
    </span>
  )
}
