import { isTerminalStatus, type WorkOrderStatus } from "./work-order-status"

export function isWorkOrderOverdue(
  dueAt: string | Date | null,
  status: WorkOrderStatus,
  now: Date = new Date(),
): boolean {
  if (dueAt === null) {
    return false
  }
  if (isTerminalStatus(status)) {
    return false
  }
  const due = dueAt instanceof Date ? dueAt : new Date(dueAt)
  if (Number.isNaN(due.getTime())) {
    return false
  }
  return due.getTime() < now.getTime()
}

export function dueAtFromScheduledEnd(scheduledEnd: string | null): string | null {
  if (scheduledEnd === null) {
    return null
  }
  const parsed = new Date(scheduledEnd)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}
