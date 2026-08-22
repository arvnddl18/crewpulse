import { isStaffRole, type Role } from "./roles"

export const WORK_ORDER_STATUSES = [
  "draft",
  "queued",
  "assigned",
  "accepted",
  "en_route",
  "on_site",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
  "needs_followup",
] as const

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number]

export const WORK_ORDER_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const

export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number]

export const WORK_ORDER_TYPES = [
  "Repair",
  "Install",
  "Migration",
  "Dedicated Migration",
] as const

export type WorkOrderType = (typeof WORK_ORDER_TYPES)[number]

export const ORDER_ACTION_TYPES = ["PR", "PV", "CH"] as const

export type OrderActionType = (typeof ORDER_ACTION_TYPES)[number]

export function isWorkOrderType(value: string): value is WorkOrderType {
  return (WORK_ORDER_TYPES as readonly string[]).includes(value)
}

export function isOrderActionType(value: string): value is OrderActionType {
  return (ORDER_ACTION_TYPES as readonly string[]).includes(value)
}

export function workOrderTypeLabel(type: WorkOrderType): string {
  return type
}

export function orderActionTypeLabel(type: OrderActionType): string {
  switch (type) {
    case "PR":
      return "Provisioning"
    case "PV":
      return "Pre-visit"
    case "CH":
      return "Change"
    default: {
      const exhaustive: never = type
      return exhaustive
    }
  }
}

export const TERMINAL_STATUSES: readonly WorkOrderStatus[] = [
  "completed",
  "cancelled",
  "needs_followup",
]

export type StatusActionKind = "primary" | "secondary" | "danger" | "success"

export type StatusAction = {
  to: WorkOrderStatus
  label: string
  kind: StatusActionKind
}

const HAPPY_PATH: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  assigned: "accepted",
  accepted: "en_route",
  en_route: "on_site",
  on_site: "in_progress",
  in_progress: "completed",
  paused: "in_progress",
}

const ACTION_LABEL: Partial<Record<WorkOrderStatus, string>> = {
  queued: "Queue",
  assigned: "Assign",
  accepted: "Accept",
  en_route: "En route",
  on_site: "Arrive",
  in_progress: "Start work",
  paused: "Pause",
  completed: "Complete",
  cancelled: "Cancel",
  needs_followup: "Needs follow-up",
}

export function isWorkOrderStatus(value: string): value is WorkOrderStatus {
  return (WORK_ORDER_STATUSES as readonly string[]).includes(value)
}

export function isWorkOrderPriority(value: string): value is WorkOrderPriority {
  return (WORK_ORDER_PRIORITIES as readonly string[]).includes(value)
}

export function isTerminalStatus(status: WorkOrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

function staffCanTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  if (to === "cancelled" && !isTerminalStatus(from)) {
    return true
  }
  if (from === "draft" && to === "queued") {
    return true
  }
  if (from === "completed" && to === "needs_followup") {
    return true
  }
  return false
}

function technicianCanTransition(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
): boolean {
  if (HAPPY_PATH[from] === to) {
    return true
  }
  if (from === "in_progress" && to === "paused") {
    return true
  }
  if (to === "cancelled" && !isTerminalStatus(from) && from !== "queued" && from !== "draft") {
    return true
  }
  return false
}

export function canTransition(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
  role: Role,
): boolean {
  if (from === to) {
    return false
  }
  if (isStaffRole(role)) {
    return staffCanTransition(from, to)
  }
  if (role === "technician") {
    return technicianCanTransition(from, to)
  }
  return false
}

function actionKind(to: WorkOrderStatus): StatusActionKind {
  if (to === "cancelled") {
    return "danger"
  }
  if (to === "completed") {
    return "success"
  }
  if (to === "paused" || to === "needs_followup") {
    return "secondary"
  }
  return "primary"
}

export function nextHappyPath(status: WorkOrderStatus): WorkOrderStatus | null {
  return HAPPY_PATH[status] ?? null
}

export function nextActions(status: WorkOrderStatus, role: Role): StatusAction[] {
  const actions: StatusAction[] = []
  for (const to of WORK_ORDER_STATUSES) {
    if (!canTransition(status, to, role)) {
      continue
    }
    const label =
      to === "in_progress" && status === "paused"
        ? "Resume"
        : (ACTION_LABEL[to] ?? to)
    actions.push({ to, label, kind: actionKind(to) })
  }

  const primaryTo = nextHappyPath(status)
  actions.sort((a, b) => {
    if (primaryTo && a.to === primaryTo) {
      return -1
    }
    if (primaryTo && b.to === primaryTo) {
      return 1
    }
    if (a.kind === "danger") {
      return 1
    }
    if (b.kind === "danger") {
      return -1
    }
    return 0
  })
  return actions
}

export function statusLabel(status: WorkOrderStatus): string {
  switch (status) {
    case "draft":
      return "Draft"
    case "queued":
      return "Queued"
    case "assigned":
      return "Assigned"
    case "accepted":
      return "Accepted"
    case "en_route":
      return "En route"
    case "on_site":
      return "On site"
    case "in_progress":
      return "In progress"
    case "paused":
      return "Paused"
    case "completed":
      return "Completed"
    case "cancelled":
      return "Cancelled"
    case "needs_followup":
      return "Needs follow-up"
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

export function priorityLabel(priority: WorkOrderPriority): string {
  switch (priority) {
    case "low":
      return "Low"
    case "medium":
      return "Medium"
    case "high":
      return "High"
    case "critical":
      return "Critical"
    default: {
      const exhaustive: never = priority
      return exhaustive
    }
  }
}

export function presenceLabel(status: string): string {
  switch (status) {
    case "offline":
      return "Offline"
    case "available":
      return "Available"
    case "on_break":
      return "On break"
    case "en_route":
      return "En route"
    case "on_site":
      return "On site"
    default:
      return status
  }
}
