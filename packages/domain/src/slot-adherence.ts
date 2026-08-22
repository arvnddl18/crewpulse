import type { SlotPeriod } from "./parse-slot-label.ts"

const MANILA_TZ = "Asia/Manila"

/** AM slot must finish before 13:00 Manila (through 12:59 inclusive). */
export const AM_FINISH_BEFORE_HOUR = 13

export type SlotAdherenceInput = {
  status: string
  slotDate: string | null
  slotPeriod: SlotPeriod | null
  completionDate: Date | null
}

export function computeSlotAdherence(input: SlotAdherenceInput): boolean {
  if (input.status.trim() !== "Completed") {
    return false
  }
  if (input.slotDate === null || input.slotPeriod === null) {
    return false
  }
  if (input.completionDate === null || Number.isNaN(input.completionDate.getTime())) {
    return false
  }

  const local = manilaDateParts(input.completionDate)
  if (local.date !== input.slotDate) {
    return false
  }

  if (input.slotPeriod === "AM") {
    return local.hour < AM_FINISH_BEFORE_HOUR
  }
  return true
}

export const SLA_BUCKETS = [
  "0-2 Days",
  "2-4 Days",
  "4-7 Days",
  "7-15 Days",
  "16-30 Days",
  "Above 30 Days",
] as const

export type SlaBucket = (typeof SLA_BUCKETS)[number]

export function computeSlaBucket(
  createdDate: Date,
  asOfDate: Date,
): SlaBucket {
  const days = wholeDaysBetween(createdDate, asOfDate)
  if (days < 2) {
    return "0-2 Days"
  }
  if (days < 4) {
    return "2-4 Days"
  }
  if (days < 7) {
    return "4-7 Days"
  }
  if (days < 15) {
    return "7-15 Days"
  }
  if (days < 30) {
    return "16-30 Days"
  }
  return "Above 30 Days"
}

const AS_OF_FILENAME_PATTERN = /(\d{4})(\d{2})(\d{2})/

export function parseAsOfDateFromFilename(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, "")
  const match = AS_OF_FILENAME_PATTERN.exec(base)
  if (match === null) {
    return null
  }
  const year = match[1]
  const month = match[2]
  const day = match[3]
  if (year === undefined || month === undefined || day === undefined) {
    return null
  }
  const date = `${year}-${month}-${day}`
  const parsed = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed)) {
    return null
  }
  return date
}

export function wholeDaysBetween(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.max(0, Math.floor((toUtc - fromUtc) / 86_400_000))
}

function manilaDateParts(date: Date): { date: string; hour: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const year = parts.find((p) => p.type === "year")?.value ?? "0000"
  const month = parts.find((p) => p.type === "month")?.value ?? "01"
  const day = parts.find((p) => p.type === "day")?.value ?? "01"
  const hourText = parts.find((p) => p.type === "hour")?.value ?? "0"
  const hour = Number.parseInt(hourText, 10)
  return {
    date: `${year}-${month}-${day}`,
    hour: Number.isNaN(hour) ? 0 : hour === 24 ? 0 : hour,
  }
}
