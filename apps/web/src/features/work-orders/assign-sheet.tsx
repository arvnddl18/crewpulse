"use client"

import { useEffect, useRef } from "react"
import type { AssignableTechnician, BoardWorkOrder } from "@/lib/types"
import { Button } from "@/shared/ui/button"
import { EmptyState } from "@/shared/ui/feedback"
import { StatusChip } from "@/shared/ui/status-chip"

export function AssignSheet({
  workOrder,
  technicians,
  pending,
  onClose,
  onAssign,
}: {
  workOrder: Pick<
    BoardWorkOrder,
    "id" | "number" | "title" | "siteAddress" | "requiredSkillName"
  >
  technicians: AssignableTechnician[]
  pending: boolean
  onClose: () => void
  onAssign: (technicianId: string) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const skill = workOrder.requiredSkillName
  const candidates = technicians.filter((t) => {
    if (t.presence === "offline") return false
    if (!skill) return true
    return t.skills.includes(skill)
  })

  useEffect(() => {
    closeRef.current?.focus()
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/50"
      role="presentation"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-[480px] flex-col border-l border-border bg-bg-muted shadow-[var(--shadow-2)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-border px-5 py-4">
          <p className="font-mono text-xs text-primary">{workOrder.number}</p>
          <h2 id="assign-sheet-title" className="mt-1 text-lg font-semibold">
            {workOrder.title}
          </h2>
          <p className="mt-1 text-sm text-text-muted">{workOrder.siteAddress}</p>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {candidates.length === 0 ? (
            <EmptyState message="No available technicians match the required skill." />
          ) : (
            <ul className="flex flex-col gap-2">
              {candidates.map((tech) => (
                <li key={tech.id}>
                  <button
                    type="button"
                    disabled={pending}
                    className="flex w-full items-center justify-between rounded-[6px] border border-border bg-surface px-3 py-3 text-left transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                    onClick={() => onAssign(tech.id)}
                  >
                    <span>
                      <span className="block font-medium">{tech.fullName}</span>
                      <span className="text-xs text-text-muted">
                        {tech.skills.join(" · ") || "No skills tagged"}
                      </span>
                    </span>
                    <StatusChip
                      status={
                        tech.presence as
                          | "offline"
                          | "available"
                          | "on_break"
                          | "en_route"
                          | "on_site"
                      }
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="border-t border-border p-4">
          <Button ref={closeRef} className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </footer>
      </aside>
    </div>
  )
}
