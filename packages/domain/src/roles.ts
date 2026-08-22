export const ROLES = ["admin", "dispatcher", "team_lead", "technician"] as const

export type Role = (typeof ROLES)[number]

export const STAFF_ROLES: readonly Role[] = ["admin", "dispatcher", "team_lead"]

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value)
}

export function isStaffRole(role: Role): boolean {
  return role === "admin" || role === "dispatcher" || role === "team_lead"
}

export function homePathForRole(role: Role): "/board" | "/jobs" {
  return role === "technician" ? "/jobs" : "/board"
}
