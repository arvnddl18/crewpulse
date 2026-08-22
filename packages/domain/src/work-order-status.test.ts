import { describe, expect, it } from "vitest"
import {
  canTransition,
  nextActions,
  nextHappyPath,
  statusLabel,
} from "./work-order-status.ts"

describe("canTransition", () => {
  it("allows the technician happy path", () => {
    expect(canTransition("assigned", "accepted", "technician")).toBe(true)
    expect(canTransition("accepted", "en_route", "technician")).toBe(true)
    expect(canTransition("en_route", "on_site", "technician")).toBe(true)
    expect(canTransition("on_site", "in_progress", "technician")).toBe(true)
    expect(canTransition("in_progress", "completed", "technician")).toBe(true)
    expect(canTransition("in_progress", "paused", "technician")).toBe(true)
    expect(canTransition("paused", "in_progress", "technician")).toBe(true)
  })

  it("rejects skipping statuses", () => {
    expect(canTransition("assigned", "completed", "technician")).toBe(false)
    expect(canTransition("queued", "en_route", "technician")).toBe(false)
  })

  it("rejects same-status no-ops", () => {
    expect(canTransition("accepted", "accepted", "technician")).toBe(false)
  })

  it("lets staff cancel a non-terminal job", () => {
    expect(canTransition("queued", "cancelled", "dispatcher")).toBe(true)
    expect(canTransition("in_progress", "cancelled", "admin")).toBe(true)
    expect(canTransition("completed", "cancelled", "dispatcher")).toBe(false)
  })

  it("does not let staff walk the field happy path", () => {
    expect(canTransition("assigned", "accepted", "dispatcher")).toBe(false)
    expect(canTransition("accepted", "en_route", "team_lead")).toBe(false)
  })

  it("lets a technician cancel an assigned job but not a queued one", () => {
    expect(canTransition("assigned", "cancelled", "technician")).toBe(true)
    expect(canTransition("queued", "cancelled", "technician")).toBe(false)
  })
})

describe("nextActions", () => {
  it("puts Accept first for an assigned technician job", () => {
    const actions = nextActions("assigned", "technician")
    expect(actions[0]).toMatchObject({ to: "accepted", kind: "primary" })
  })

  it("uses Complete as success and Pause as secondary on in_progress", () => {
    const actions = nextActions("in_progress", "technician")
    expect(actions.some((a) => a.to === "completed" && a.kind === "success")).toBe(
      true,
    )
    expect(actions.some((a) => a.to === "paused" && a.kind === "secondary")).toBe(
      true,
    )
  })

  it("labels resume from paused", () => {
    const actions = nextActions("paused", "technician")
    expect(actions[0]).toMatchObject({ to: "in_progress", label: "Resume" })
  })

  it("offers cancel only for staff on a queued job", () => {
    expect(nextActions("queued", "dispatcher").map((a) => a.to)).toEqual([
      "cancelled",
    ])
    expect(nextActions("queued", "technician")).toEqual([])
  })
})

describe("nextHappyPath / labels", () => {
  it("maps assigned to accepted", () => {
    expect(nextHappyPath("assigned")).toBe("accepted")
    expect(nextHappyPath("completed")).toBeNull()
  })

  it("labels en_route for chips", () => {
    expect(statusLabel("en_route")).toBe("En route")
  })
})
