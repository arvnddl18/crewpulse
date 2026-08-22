export const PRESENCE_STATUSES = [
  "offline",
  "available",
  "on_break",
  "en_route",
  "on_site",
] as const

export type PresenceStatus = (typeof PRESENCE_STATUSES)[number]

export const HEARTBEAT_INTERVAL_MS = 30_000
export const PRESENCE_STALE_MS = 90_000

export const PRESENCE_COLUMNS: readonly PresenceStatus[] = [
  "available",
  "en_route",
  "on_site",
  "on_break",
  "offline",
]

export function isPresenceStatus(value: string): value is PresenceStatus {
  return (PRESENCE_STATUSES as readonly string[]).includes(value)
}

export function isPresenceStale(
  lastSeenAt: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() - lastSeenAt.getTime() > PRESENCE_STALE_MS
}

export function displayPresence(
  status: PresenceStatus,
  lastSeenAt: Date,
  now: Date = new Date(),
): PresenceStatus {
  if (status === "offline") {
    return "offline"
  }
  if (isPresenceStale(lastSeenAt, now)) {
    return "offline"
  }
  return status
}

export const SETTABLE_PRESENCE: readonly PresenceStatus[] = [
  "available",
  "on_break",
  "offline",
]

export function canSetPresence(status: PresenceStatus): boolean {
  return SETTABLE_PRESENCE.includes(status)
}
