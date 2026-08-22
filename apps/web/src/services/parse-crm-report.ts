import {
  computeSlaBucket,
  computeSlotAdherence,
  parseAsOfDateFromFilename,
  parseSlotLabel,
} from "@crewpulse/domain"
import ExcelJS from "exceljs"

export type ParsedCrmReportRow = {
  workOrderNumber: string
  slotRaw: string | null
  slotDate: string | null
  slotPeriod: "AM" | "PM" | null
  status: string | null
  substatus: string | null
  skillset: string | null
  queue: string | null
  teamName: string | null
  contractorName: string | null
  delayReason: string | null
  slaBucket: string | null
  createdAtSrc: string | null
  completedAtSrc: string | null
  adhered: boolean
}

export type ParseCrmReportResult =
  | { ok: true; rows: ParsedCrmReportRow[]; sheetName: string }
  | { ok: false; code: "UNSUPPORTED" | "EMPTY"; message: string }

const REQUIRED_HEADERS = ["workordernumber", "appointmentdate", "status", "createdate"]

const COLUMN_ALIASES: Record<string, string[]> = {
  workordernumber: ["workordernumber", "work order number"],
  appointmentdate: ["appointmentdate", "appointment date"],
  createdate: ["createdate", "create date"],
  completiondate: ["completiondate", "completion date"],
  status: ["status"],
  substatus: ["substatus"],
  skillset: ["skillset", "skill set"],
  queue: ["queue"],
  team: ["team"],
  contractorname: ["contractorname", "contractor name"],
  delayreason: ["delayreason", "delay reason"],
  sla: ["sla"],
}

export async function parseCrmReportBuffer(
  buffer: Buffer | ArrayBuffer,
  asOfDate: Date,
): Promise<ParseCrmReportResult> {
  const workbook = new ExcelJS.Workbook()
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(new Uint8Array(buffer))
  await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer)

  const sheet =
    workbook.getWorksheet("Sheet2") ??
    workbook.worksheets.find((ws) => sheetHasHeaders(ws, REQUIRED_HEADERS)) ??
    null

  if (!sheet) {
    return {
      ok: false,
      code: "UNSUPPORTED",
      message: "Could not find Sheet2 or a sheet with CRM/BSS headers.",
    }
  }

  const columnMap = buildColumnMap(sheet)
  if (!REQUIRED_HEADERS.every((header) => columnMap.has(header))) {
    return {
      ok: false,
      code: "UNSUPPORTED",
      message: "Workbook is missing required CRM/BSS columns.",
    }
  }

  const rows: ParsedCrmReportRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return
    }
    const parsed = parseRow(row, columnMap, asOfDate)
    if (parsed) {
      rows.push(parsed)
    }
  })

  if (rows.length === 0) {
    return { ok: false, code: "EMPTY", message: "No data rows found in the report." }
  }

  return { ok: true, rows, sheetName: sheet.name }
}

function sheetHasHeaders(sheet: ExcelJS.Worksheet, required: string[]): boolean {
  const map = buildColumnMap(sheet)
  return required.every((header) => map.has(header))
}

function buildColumnMap(sheet: ExcelJS.Worksheet): Map<string, number> {
  const map = new Map<string, number>()
  sheet.getRow(1).eachCell((cell, col) => {
    const normalized = normalizeHeader(String(cell.value ?? ""))
    if (normalized.length === 0) {
      return
    }
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(normalized)) {
        map.set(key, col)
      }
    }
  })
  return map
}

function parseRow(
  row: ExcelJS.Row,
  columnMap: Map<string, number>,
  asOfDate: Date,
): ParsedCrmReportRow | null {
  const workOrderNumber = cellText(row, columnMap.get("workordernumber"))
  if (!workOrderNumber) {
    return null
  }

  const slotRaw = cellText(row, columnMap.get("appointmentdate"))
  let slotDate: string | null = null
  let slotPeriod: "AM" | "PM" | null = null
  if (slotRaw) {
    const slot = parseSlotLabel(slotRaw)
    if (slot.ok) {
      slotDate = slot.data.slotDate
      slotPeriod = slot.data.slotPeriod
    }
  }

  const status = cellText(row, columnMap.get("status"))
  const createdAt = cellDate(row, columnMap.get("createdate"))
  const completedAt = cellDate(row, columnMap.get("completiondate"))
  const slaFromFile = cellText(row, columnMap.get("sla"))
  const slaBucket =
    createdAt !== null
      ? computeSlaBucket(createdAt, asOfDate)
      : slaFromFile

  return {
    workOrderNumber,
    slotRaw,
    slotDate,
    slotPeriod,
    status,
    substatus: cellText(row, columnMap.get("substatus")),
    skillset: cellText(row, columnMap.get("skillset")),
    queue: cellText(row, columnMap.get("queue")),
    teamName: cellText(row, columnMap.get("team")),
    contractorName: cellText(row, columnMap.get("contractorname")),
    delayReason: cellText(row, columnMap.get("delayreason")),
    slaBucket,
    createdAtSrc: createdAt?.toISOString() ?? null,
    completedAtSrc: completedAt?.toISOString() ?? null,
    adhered: computeSlotAdherence({
      status: status ?? "",
      slotDate,
      slotPeriod,
      completionDate: completedAt,
    }),
  }
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "")
}

function cellText(row: ExcelJS.Row, col: number | undefined): string | null {
  if (col === undefined) {
    return null
  }
  const value = row.getCell(col).value
  if (value === null || value === undefined) {
    return null
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    const text = (value as { text?: string }).text
    return text?.trim() ? text.trim() : null
  }
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function cellDate(row: ExcelJS.Row, col: number | undefined): Date | null {
  if (col === undefined) {
    return null
  }
  const value = row.getCell(col).value
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const date = new Date(excelEpoch.getTime() + value * 86_400_000)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

export function asOfDateForUpload(
  filename: string,
  fallback: Date = new Date(),
): Date {
  const parsed = parseAsOfDateFromFilename(filename)
  if (parsed === null) {
    return fallback
  }
  const date = new Date(`${parsed}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? fallback : date
}
