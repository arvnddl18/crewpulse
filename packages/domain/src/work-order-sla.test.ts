import { describe, expect, it } from "vitest"
import { isWorkOrderOverdue } from "./work-order-sla.ts"

describe("isWorkOrderOverdue", () => {
  const now = new Date("2026-08-18T12:00:00.000Z")

  it("returns true for active jobs past due_at", () => {
    expect(
      isWorkOrderOverdue("2026-08-18T10:00:00.000Z", "in_progress", now),
    ).toBe(true)
  })

  it("returns false for terminal statuses even if due_at is past", () => {
    expect(
      isWorkOrderOverdue("2026-08-18T10:00:00.000Z", "completed", now),
    ).toBe(false)
  })

  it("returns false when due_at is null", () => {
    expect(isWorkOrderOverdue(null, "assigned", now)).toBe(false)
  })
})
