import { describe, expect, it } from "vitest"
import {
  computeSlaBucket,
  computeSlotAdherence,
  parseAsOfDateFromFilename,
} from "./slot-adherence.ts"

describe("computeSlotAdherence", () => {
  it("passes AM when Completed same day before 12:59 PM Manila", () => {
    expect(
      computeSlotAdherence({
        status: "Completed",
        slotDate: "2026-06-13",
        slotPeriod: "AM",
        completionDate: new Date("2026-06-13T01:00:00.000Z"), // 09:00 Manila
      }),
    ).toBe(true)
  })

  it("passes AM at 12:59 Manila (through 12:59 inclusive)", () => {
    expect(
      computeSlotAdherence({
        status: "Completed",
        slotDate: "2026-06-13",
        slotPeriod: "AM",
        completionDate: new Date("2026-06-13T04:59:00.000Z"), // 12:59 Manila
      }),
    ).toBe(true)
  })

  it("fails AM at 13:00 Manila", () => {
    expect(
      computeSlotAdherence({
        status: "Completed",
        slotDate: "2026-06-13",
        slotPeriod: "AM",
        completionDate: new Date("2026-06-13T05:00:00.000Z"), // 13:00 Manila
      }),
    ).toBe(false)
  })

  it("fails AM when Completed later the same afternoon", () => {
    expect(
      computeSlotAdherence({
        status: "Completed",
        slotDate: "2026-06-13",
        slotPeriod: "AM",
        completionDate: new Date("2026-06-13T06:00:00.000Z"), // 14:00 Manila
      }),
    ).toBe(false)
  })

  it("passes PM when Completed after noon on slot date", () => {
    expect(
      computeSlotAdherence({
        status: "Completed",
        slotDate: "2026-06-13",
        slotPeriod: "PM",
        completionDate: new Date("2026-06-13T06:00:00.000Z"), // 14:00 Manila
      }),
    ).toBe(true)
  })

  it("passes PM when Completed before noon on the same slot date", () => {
    expect(
      computeSlotAdherence({
        status: "Completed",
        slotDate: "2026-06-13",
        slotPeriod: "PM",
        completionDate: new Date("2026-06-13T01:00:00.000Z"), // 09:00 Manila
      }),
    ).toBe(true)
  })

  it("fails when completion is a different calendar day", () => {
    expect(
      computeSlotAdherence({
        status: "Completed",
        slotDate: "2026-06-13",
        slotPeriod: "PM",
        completionDate: new Date("2026-06-14T01:00:00.000Z"), // 09:00 next day Manila
      }),
    ).toBe(false)
  })

  it("returns false when status is not Completed", () => {
    expect(
      computeSlotAdherence({
        status: "Delayed",
        slotDate: "2026-06-13",
        slotPeriod: "PM",
        completionDate: new Date("2026-06-13T06:00:00.000Z"),
      }),
    ).toBe(false)
  })

  it("returns false when slot or completion is missing", () => {
    expect(
      computeSlotAdherence({
        status: "Completed",
        slotDate: null,
        slotPeriod: "PM",
        completionDate: new Date(),
      }),
    ).toBe(false)
  })
})

describe("computeSlaBucket", () => {
  it("maps day ranges per SLOT-ADHERENCE", () => {
    const created = new Date("2026-06-01T00:00:00.000Z")
    expect(computeSlaBucket(created, new Date("2026-06-01T00:00:00.000Z"))).toBe(
      "0-2 Days",
    )
    expect(computeSlaBucket(created, new Date("2026-06-02T00:00:00.000Z"))).toBe(
      "0-2 Days",
    )
    expect(computeSlaBucket(created, new Date("2026-06-03T00:00:00.000Z"))).toBe(
      "2-4 Days",
    )
    expect(computeSlaBucket(created, new Date("2026-07-05T00:00:00.000Z"))).toBe(
      "Above 30 Days",
    )
  })
})

describe("parseAsOfDateFromFilename", () => {
  it("extracts YYYYMMDD from the canonical sample name", () => {
    expect(parseAsOfDateFromFilename("20260615 all status.xlsx")).toBe("2026-06-15")
  })

  it("returns null when no date token is present", () => {
    expect(parseAsOfDateFromFilename("all-status.xlsx")).toBeNull()
  })
})
