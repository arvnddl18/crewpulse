"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { ChecklistTemplateView } from "@/lib/types"
import { Button } from "@/shared/ui/button"
import { Toggle } from "@/shared/ui/toggle"
import { ErrorState, Skeleton } from "@/shared/ui/feedback"

type EditableItem = {
  label: string
  sortOrder: number
  isRequired: boolean
  requiresPhoto: boolean
}

export function ChecklistsSettingsShell() {
  const queryClient = useQueryClient()
  const templatesQuery = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: () => apiFetch<ChecklistTemplateView[]>("/api/v1/checklists/templates"),
  })

  if (templatesQuery.isLoading) {
    return <Skeleton className="h-48" />
  }
  if (templatesQuery.isError) {
    return (
      <ErrorState
        message="Could not load checklist templates."
        onRetry={() => void templatesQuery.refetch()}
      />
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Safety checklists</h1>
        <p className="mt-1 text-sm text-text-muted">
          Per-skill templates gate the en route transition for technicians.
        </p>
      </header>
      {(templatesQuery.data ?? []).map((template) => (
        <TemplateEditor
          key={template.id}
          template={template}
          onSaved={() => void queryClient.invalidateQueries({ queryKey: ["checklist-templates"] })}
        />
      ))}
    </div>
  )
}

function TemplateEditor({
  template,
  onSaved,
}: {
  template: ChecklistTemplateView
  onSaved: () => void
}) {
  const [name, setName] = useState(template.name)
  const [isActive, setIsActive] = useState(template.isActive)
  const [items, setItems] = useState<EditableItem[]>(
    template.items.map((i) => ({
      label: i.label,
      sortOrder: i.sortOrder,
      isRequired: i.isRequired,
      requiresPhoto: i.requiresPhoto,
    })),
  )

  useEffect(() => {
    setName(template.name)
    setIsActive(template.isActive)
    setItems(
      template.items.map((i) => ({
        label: i.label,
        sortOrder: i.sortOrder,
        isRequired: i.isRequired,
        requiresPhoto: i.requiresPhoto,
      })),
    )
  }, [template])

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/checklists/templates/${template.id}`, {
        method: "PUT",
        body: JSON.stringify({ name, isActive, items }),
      }),
    onSuccess: () => {
      toast.success("Template saved")
      onSaved()
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : "Save failed"),
  })

  return (
    <section className="rounded-[6px] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-primary">{template.skillName}</p>
          <input
            className="mt-1 w-full max-w-md rounded-[4px] border border-border bg-bg px-3 py-1.5 text-lg font-semibold"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Toggle
          size="sm"
          checked={isActive}
          onChange={setIsActive}
          label="Active"
        />
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
            <input
              className="min-w-0 flex-1 rounded-[4px] border border-border bg-bg px-2 py-1"
              value={item.label}
              onChange={(e) => {
                const next = [...items]
                next[index] = { ...item, label: e.target.value }
                setItems(next)
              }}
            />
            <Toggle
              size="sm"
              checked={item.isRequired}
              onChange={(v) => {
                const next = [...items]
                next[index] = { ...item, isRequired: v }
                setItems(next)
              }}
              label="Required"
            />
            <Toggle
              size="sm"
              checked={item.requiresPhoto}
              onChange={(v) => {
                const next = [...items]
                next[index] = { ...item, requiresPhoto: v }
                setItems(next)
              }}
              label="Photo"
            />
            <Button
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setItems(items.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() =>
            setItems([
              ...items,
              {
                label: "New item",
                sortOrder: items.length,
                isRequired: true,
                requiresPhoto: false,
              },
            ])
          }
        >
          Add item
        </Button>
        <Button variant="primary" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          Save template
        </Button>
      </div>
    </section>
  )
}
