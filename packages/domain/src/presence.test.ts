import { describe, expect, it } from "vitest"
import {
  canSetPresence,
  displayPresence,
  isPresenceStale,
  PRESENCE_STALE_MS,
} from "./presence.ts"

describe("isPresenceStale", () => {
  it("is stale after 90 seconds", () => {
    const now = new Date("2026-08-18T12:00:00.000Z")
    const last = new Date(now.getTime() - PRESENCE_STALE_MS - 1)
    expect(isPresenceStale(last, now)).toBe(true)
  })

  it("is fresh at 90 seconds exactly", () => {
    const now = new Date("2026-08-18T12:00:00.000Z")
    const last = new Date(now.getTime() - PRESENCE_STALE_MS)
    expect(isPresenceStale(last, now)).toBe(false)
  })
})

describe("displayPresence", () => {
  it("forces offline when last seen is stale", () => {
    const now = new Date("2026-08-18T12:00:00.000Z")
    const last = new Date(now.getTime() - 120_000)
    expect(displayPresence("available", last, now)).toBe("offline")
  })

  it("keeps en_route when fresh", () => {
    const now = new Date("2026-08-18T12:00:00.000Z")
    const last = new Date(now.getTime() - 10_000)
    expect(displayPresence("en_route", last, now)).toBe("en_route")
  })
})

describe("canSetPresence", () => {
  it("allows available, break, offline only", () => {
    expect(canSetPresence("available")).toBe(true)
    expect(canSetPresence("on_break")).toBe(true)
    expect(canSetPresence("offline")).toBe(true)
    expect(canSetPresence("en_route")).toBe(false)
  })
})
