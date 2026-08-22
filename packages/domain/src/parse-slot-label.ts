import type { ActionResult } from "./result.ts"

export type SlotPeriod = "AM" | "PM"

export type ParsedSlotLabel = {
  slotDate: string
  slotPeriod: SlotPeriod
  slotRaw: string
}

export type SlotLabelErrorCode = "EMPTY_INPUT" | "INVALID_FORMAT" | "INVALID_DATE"

const SLOT_LABEL_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (AM|PM) Slot$/i

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

export function parseSlotLabel(
  input: string,
): ActionResult<ParsedSlotLabel, SlotLabelErrorCode> {
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return fail("EMPTY_INPUT", "Slot label is empty.")
  }

  const match = SLOT_LABEL_PATTERN.exec(trimmed)
  if (match === null) {
    return fail("INVALID_FORMAT", "Slot label must be YYYY-MM-DD AM|PM Slot.")
  }

  const yearText = match[1]
  const monthText = match[2]
  const dayText = match[3]
  const periodText = match[4]
  if (
    yearText === undefined ||
    monthText === undefined ||
    dayText === undefined ||
    periodText === undefined
  ) {
    return fail("INVALID_FORMAT", "Slot label must be YYYY-MM-DD AM|PM Slot.")
  }

  const year = Number.parseInt(yearText, 10)
  const month = Number.parseInt(monthText, 10)
  const day = Number.parseInt(dayText, 10)
  if (!isValidCalendarDate(year, month, day)) {
    return fail("INVALID_DATE", "Slot date is not a valid calendar date.")
  }

  const slotPeriod = toSlotPeriod(periodText)
  if (slotPeriod === undefined) {
    return fail("INVALID_FORMAT", "Slot label must be YYYY-MM-DD AM|PM Slot.")
  }

  return {
    ok: true,
    data: {
      slotDate: `${yearText}-${monthText}-${dayText}`,
      slotPeriod,
      slotRaw: input,
    },
  }
}

function fail(
  code: SlotLabelErrorCode,
  message: string,
): ActionResult<ParsedSlotLabel, SlotLabelErrorCode> {
  return { ok: false, code, message }
}

function toSlotPeriod(value: string): SlotPeriod | undefined {
  const normalized = value.toUpperCase()
  if (normalized === "AM" || normalized === "PM") {
    return normalized
  }
  return undefined
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const daysInMonth = DAYS_IN_MONTH[month - 1]
  if (daysInMonth === undefined) {
    return false
  }
  const lastDay = month === 2 && isLeapYear(year) ? 29 : daysInMonth
  return day >= 1 && day <= lastDay
}
