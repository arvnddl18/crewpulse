import { describe, expect, it } from "vitest"
import {
  parseSlotLabel,
  type ParsedSlotLabel,
  type SlotLabelErrorCode,
  type SlotPeriod,
} from "./parse-slot-label.ts"

describe("parseSlotLabel", () => {
  describe("happy path", () => {
    it("parses a PM slot from SLOT-ADHERENCE examples", () => {
      expectSuccess("2026-06-13 PM Slot", {
        slotDate: "2026-06-13",
        slotPeriod: "PM",
      })
    })

    it("parses an AM slot from SLOT-ADHERENCE examples", () => {
      expectSuccess("2026-06-15 AM Slot", {
        slotDate: "2026-06-15",
        slotPeriod: "AM",
      })
    })

    it("trims outer whitespace but keeps slotRaw untrimmed", () => {
      const input = "  2026-06-13 PM Slot  "
      expectSuccess(input, {
        slotDate: "2026-06-13",
        slotPeriod: "PM",
      })
    })

    it("normalizes am / pm / Am to AM or PM", () => {
      expectSuccess("2026-06-13 am Slot", {
        slotDate: "2026-06-13",
        slotPeriod: "AM",
      })
      expectSuccess("2026-06-13 pm Slot", {
        slotDate: "2026-06-13",
        slotPeriod: "PM",
      })
      expectSuccess("2026-06-13 Am Slot", {
        slotDate: "2026-06-13",
        slotPeriod: "AM",
      })
    })

    it("accepts case-insensitive Slot suffix", () => {
      expectSuccess("2026-06-13 PM slot", {
        slotDate: "2026-06-13",
        slotPeriod: "PM",
      })
      expectSuccess("2026-06-13 PM SLOT", {
        slotDate: "2026-06-13",
        slotPeriod: "PM",
      })
    })

    it("accepts 29 February in a leap year", () => {
      expectSuccess("2024-02-29 AM Slot", {
        slotDate: "2024-02-29",
        slotPeriod: "AM",
      })
    })

    it("accepts 31 January", () => {
      expectSuccess("2026-01-31 PM Slot", {
        slotDate: "2026-01-31",
        slotPeriod: "PM",
      })
    })

    it("trims a trailing newline and still succeeds", () => {
      expectSuccess("2026-06-13 PM Slot\n", {
        slotDate: "2026-06-13",
        slotPeriod: "PM",
      })
    })
  })

  describe("failures", () => {
    it("returns EMPTY_INPUT for an empty string", () => {
      expectFailure("", "EMPTY_INPUT")
    })

    it("returns EMPTY_INPUT for whitespace-only input", () => {
      expectFailure("   ", "EMPTY_INPUT")
    })

    it("returns INVALID_FORMAT when the date and period have no space", () => {
      expectFailure("2026-06-13PM Slot", "INVALID_FORMAT")
    })

    it("returns INVALID_FORMAT for a double space between tokens", () => {
      expectFailure("2026-06-13  PM Slot", "INVALID_FORMAT")
    })

    it("returns INVALID_FORMAT when Slot is missing", () => {
      expectFailure("2026-06-13 PM", "INVALID_FORMAT")
    })

    it("returns INVALID_FORMAT for an unknown period", () => {
      expectFailure("2026-06-13 XM Slot", "INVALID_FORMAT")
    })

    it("returns INVALID_FORMAT when the month or day is not zero-padded", () => {
      expectFailure("2026-6-13 PM Slot", "INVALID_FORMAT")
    })

    it("returns INVALID_FORMAT for day-month-year order", () => {
      expectFailure("13-06-2026 PM Slot", "INVALID_FORMAT")
    })

    it("returns INVALID_FORMAT when extra tokens follow", () => {
      expectFailure("2026-06-13 PM Slot extra", "INVALID_FORMAT")
    })

    it("returns INVALID_FORMAT when a prefix precedes the label", () => {
      expectFailure("prefix 2026-06-13 PM Slot", "INVALID_FORMAT")
    })

    it("returns INVALID_DATE for 31 February", () => {
      expectFailure("2026-02-31 AM Slot", "INVALID_DATE")
    })

    it("returns INVALID_DATE for 29 February in a non-leap year", () => {
      expectFailure("2026-02-29 AM Slot", "INVALID_DATE")
    })

    it("returns INVALID_DATE for month 13", () => {
      expectFailure("2026-13-01 AM Slot", "INVALID_DATE")
    })

    it("returns INVALID_DATE for month 00", () => {
      expectFailure("2026-00-10 AM Slot", "INVALID_DATE")
    })

    it("returns INVALID_DATE for 31 April", () => {
      expectFailure("2026-04-31 PM Slot", "INVALID_DATE")
    })
  })

  describe("edge cases (tester)", () => {
    it("accepts 29 February 2000 (divisible by 400)", () => {
      expectSuccess("2000-02-29 AM Slot", {
        slotDate: "2000-02-29",
        slotPeriod: "AM",
      })
    })

    it("returns INVALID_DATE for 29 February 1900 (divisible by 100, not 400)", () => {
      expectFailure("1900-02-29 AM Slot", "INVALID_DATE")
    })

    it("returns INVALID_DATE for day 00", () => {
      expectFailure("2026-12-00 AM Slot", "INVALID_DATE")
    })

    it("returns INVALID_DATE for day 32", () => {
      expectFailure("2026-06-32 AM Slot", "INVALID_DATE")
    })

    it("keeps slotRaw as the original string when leading tabs are trimmed for parse", () => {
      const input = "\t2026-06-13 PM Slot\t"
      expectSuccess(input, {
        slotDate: "2026-06-13",
        slotPeriod: "PM",
      })
    })

    it("returns INVALID_FORMAT for a tab between date and period", () => {
      expectFailure("2026-06-13\tPM Slot", "INVALID_FORMAT")
    })

    it("returns INVALID_FORMAT for a tab between period and Slot", () => {
      expectFailure("2026-06-13 PM\tSlot", "INVALID_FORMAT")
    })

    it("returns EMPTY_INPUT for tab-only input", () => {
      expectFailure("\t\t", "EMPTY_INPUT")
    })

    it("trims outer unicode spaces but keeps slotRaw original", () => {
      const input = "\u00A02026-06-13 PM Slot\u00A0"
      expectSuccess(input, {
        slotDate: "2026-06-13",
        slotPeriod: "PM",
      })
    })

    it("returns INVALID_FORMAT for a unicode space between date and period", () => {
      expectFailure("2026-06-13\u00A0PM Slot", "INVALID_FORMAT")
    })

    it("returns INVALID_FORMAT for an ideographic space between tokens", () => {
      expectFailure("2026-06-13\u3000PM Slot", "INVALID_FORMAT")
    })

    it("returns EMPTY_INPUT for unicode-space-only input", () => {
      expectFailure("\u00A0\u00A0", "EMPTY_INPUT")
    })

    it("returns INVALID_FORMAT for a zero-width space prefix (not trimmed)", () => {
      expectFailure("\u200B2026-06-13 PM Slot", "INVALID_FORMAT")
    })

    it("accepts lowercase slot suffix with AM", () => {
      expectSuccess("2026-06-15 AM slot", {
        slotDate: "2026-06-15",
        slotPeriod: "AM",
      })
    })

    it("accepts a valid AM label with a trailing newline", () => {
      expectSuccess("2026-06-15 AM Slot\n", {
        slotDate: "2026-06-15",
        slotPeriod: "AM",
      })
    })

    it("returns INVALID_FORMAT when the string ends with AM and a newline (Slot missing)", () => {
      expectFailure("2026-06-13 AM\n", "INVALID_FORMAT")
    })

    it("returns INVALID_FORMAT for a newline between AM and Slot", () => {
      expectFailure("2026-06-13 AM\nSlot", "INVALID_FORMAT")
    })

    it("returns INVALID_FORMAT for a double space between period and Slot", () => {
      expectFailure("2026-06-13 PM  Slot", "INVALID_FORMAT")
    })

    it("does not throw on empty, malformed, or calendar-invalid input", () => {
      const inputs = [
        "",
        "   ",
        "\n",
        "not-a-slot",
        "2026-02-29 AM Slot",
        "2026-02-31 AM Slot",
        "2026-04-31 PM Slot",
        "2026-13-01 AM Slot",
        "2026-00-10 AM Slot",
        "2026-12-00 AM Slot",
        "2026-06-13  PM Slot",
        "2026-06-13 AM\n",
      ]
      for (const input of inputs) {
        expect(() => parseSlotLabel(input)).not.toThrow()
      }
    })
  })
})

function expectSuccess(
  input: string,
  expected: { slotDate: string; slotPeriod: SlotPeriod },
): void {
  const result = parseSlotLabel(input)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  const data: ParsedSlotLabel = result.data
  expect(data).toEqual({
    slotDate: expected.slotDate,
    slotPeriod: expected.slotPeriod,
    slotRaw: input,
  })
  expect("message" in result).toBe(false)
}

function expectFailure(input: string, code: SlotLabelErrorCode): void {
  const result = parseSlotLabel(input)
  expect(result.ok).toBe(false)
  if (result.ok) {
    return
  }
  expect(result.code).toBe(code)
  expect(result.message.length).toBeGreaterThan(0)
}
