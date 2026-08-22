import type { WorkOrderStatus } from "./work-order-status"

export const GPS_TRACKING_STATUSES: readonly WorkOrderStatus[] = [
  "accepted",
  "en_route",
  "on_site",
  "in_progress",
  "paused",
]

export const LOCATION_PING_INTERVAL_MS = 30_000

export type ChecklistItemView = {
  id: string
  label: string
  sortOrder: number
  isRequired: boolean
  requiresPhoto: boolean
  completed: boolean
  attachmentId: string | null
}

export function isGpsTrackingStatus(status: WorkOrderStatus): boolean {
  return GPS_TRACKING_STATUSES.includes(status)
}

export function canStreamLocation(input: {
  optedIn: boolean
  hasActiveJob: boolean
  status: WorkOrderStatus | null
  pageVisible: boolean
}): boolean {
  if (!input.optedIn || !input.hasActiveJob || !input.pageVisible) {
    return false
  }
  if (!input.status) {
    return false
  }
  return isGpsTrackingStatus(input.status)
}

export function isChecklistComplete(items: ChecklistItemView[]): boolean {
  const required = items.filter((i) => i.isRequired)
  if (required.length === 0) {
    return true
  }
  return required.every((i) => i.completed)
}

export function checklistProgress(items: ChecklistItemView[]): {
  required: number
  completed: number
} {
  const required = items.filter((i) => i.isRequired)
  return {
    required: required.length,
    completed: required.filter((i) => i.completed).length,
  }
}
