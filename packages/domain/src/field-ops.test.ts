import { describe, expect, it } from "vitest"
import {
  canStreamLocation,
  checklistProgress,
  isChecklistComplete,
  isGpsTrackingStatus,
} from "./field-ops"

describe("isGpsTrackingStatus", () => {
  it("allows field statuses", () => {
    expect(isGpsTrackingStatus("accepted")).toBe(true)
    expect(isGpsTrackingStatus("en_route")).toBe(true)
    expect(isGpsTrackingStatus("assigned")).toBe(false)
    expect(isGpsTrackingStatus("completed")).toBe(false)
  })
})

describe("canStreamLocation", () => {
  it("requires opt-in, active job, legal status, and foreground", () => {
    expect(
      canStreamLocation({
        optedIn: true,
        hasActiveJob: true,
        status: "en_route",
        pageVisible: true,
      }),
    ).toBe(true)
    expect(
      canStreamLocation({
        optedIn: false,
        hasActiveJob: true,
        status: "en_route",
        pageVisible: true,
      }),
    ).toBe(false)
    expect(
      canStreamLocation({
        optedIn: true,
        hasActiveJob: true,
        status: "assigned",
        pageVisible: true,
      }),
    ).toBe(false)
    expect(
      canStreamLocation({
        optedIn: true,
        hasActiveJob: true,
        status: "en_route",
        pageVisible: false,
      }),
    ).toBe(false)
  })
})

describe("checklistProgress", () => {
  it("counts required items only", () => {
    const items = [
      {
        id: "1",
        label: "Hard hat",
        sortOrder: 1,
        isRequired: true,
        requiresPhoto: false,
        completed: true,
        attachmentId: null,
      },
      {
        id: "2",
        label: "Gloves",
        sortOrder: 2,
        isRequired: true,
        requiresPhoto: false,
        completed: false,
        attachmentId: null,
      },
      {
        id: "3",
        label: "Photo booth",
        sortOrder: 3,
        isRequired: false,
        requiresPhoto: false,
        completed: false,
        attachmentId: null,
      },
    ]
    expect(checklistProgress(items)).toEqual({ required: 2, completed: 1 })
    expect(isChecklistComplete(items)).toBe(false)
  })
})
