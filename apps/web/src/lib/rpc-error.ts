import { isStaffRole, type Role } from "@crewpulse/domain"

export function rpcErrorCode(error: {
  message: string
  details?: string
  hint?: string
  code?: string
}): { code: string; message: string } {
  const detail = (error.details ?? "").toUpperCase()
  if (detail.includes("CHECKLIST_INCOMPLETE")) {
    return { code: "CHECKLIST_INCOMPLETE", message: "Safety checklist incomplete" }
  }
  if (detail.includes("ILLEGAL_TRANSITION")) {
    return { code: "ILLEGAL_TRANSITION", message: error.message }
  }
  if (detail.includes("TECH_OFFLINE")) {
    return { code: "TECH_OFFLINE", message: "Technician is offline" }
  }
  if (detail.includes("NOT_ASSIGNEE")) {
    return { code: "NOT_ASSIGNEE", message: error.message }
  }
  if (detail.includes("FORBIDDEN") || error.code === "42501") {
    return { code: "FORBIDDEN", message: "Not allowed" }
  }
  if (detail.includes("NOT_FOUND") || error.code === "P0002") {
    return { code: "NOT_FOUND", message: "Work order not found" }
  }
  if (detail.includes("VALIDATION")) {
    return { code: "VALIDATION", message: error.message }
  }
  return { code: "UNKNOWN", message: "Something went wrong. Try again." }
}

export function canAccessStaffApi(role: Role): boolean {
  return isStaffRole(role)
}
