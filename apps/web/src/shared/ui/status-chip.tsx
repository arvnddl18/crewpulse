import {
  presenceLabel,
  statusLabel,
  type PresenceStatus,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@crewpulse/domain"
import { cn } from "@/lib/cn"

const TEAM_BAR: Record<string, string> = {
  teal: "bg-[var(--teal-live)]",
  amber: "bg-[var(--signal-amber)]",
  blue: "bg-[#5b8def]",
}

export function teamBarClass(color: string): string {
  return TEAM_BAR[color] ?? TEAM_BAR.teal ?? "bg-[var(--teal-live)]"
}

export function statusChipClass(status: WorkOrderStatus | PresenceStatus): string {
  switch (status) {
    case "offline":
      return "status-offline"
    case "available":
      return "status-available"
    case "on_break":
    case "paused":
      return "status-break"
    case "en_route":
      return "status-enroute"
    case "on_site":
    case "in_progress":
      return "status-onsite"
    case "completed":
      return "status-done"
    case "cancelled":
      return "status-cancel"
    case "needs_followup":
      return "status-break"
    case "draft":
    case "queued":
    case "assigned":
    case "accepted":
      return "status-enroute"
    default:
      return "status-offline"
  }
}

export function priorityChipClass(priority: WorkOrderPriority): string {
  if (priority === "critical") {
    return "priority-critical"
  }
  if (priority === "high") {
    return "status-cancel"
  }
  return "status-offline"
}

export function labelForStatus(status: WorkOrderStatus | PresenceStatus): string {
  if (
    status === "offline" ||
    status === "available" ||
    status === "on_break" ||
    status === "en_route" ||
    status === "on_site"
  ) {
    return presenceLabel(status)
  }
  return statusLabel(status as WorkOrderStatus)
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (diff < 60_000) return "just now"
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

type StatusChipProps = {
  status: WorkOrderStatus | PresenceStatus
  live?: boolean
  className?: string
}

export function StatusChip({ status, live, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "status-chip inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em]",
        statusChipClass(status),
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current opacity-90",
          live && status !== "offline" && "is-live",
        )}
        aria-hidden
      />
      {labelForStatus(status)}
    </span>
  )
}

type PriorityChipProps = {
  priority: WorkOrderPriority
  className?: string
}

export function PriorityChip({ priority, className }: PriorityChipProps) {
  return (
    <span
      className={cn(
        "status-chip inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em]",
        priorityChipClass(priority),
        className,
      )}
    >
      {priority}
    </span>
  )
}

export function OverdueChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "status-chip status-cancel inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em]",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" aria-hidden />
      Overdue
    </span>
  )
}

export function formatDueAt(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
