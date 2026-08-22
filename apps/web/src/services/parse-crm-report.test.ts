import ExcelJS from "exceljs"
import { describe, expect, it } from "vitest"
import { parseCrmReportBuffer } from "./parse-crm-report"

describe("parseCrmReportBuffer", () => {
  it("parses Sheet2 rows and computes slot adherence from completiondate", async () => {
    const buffer = await buildSampleWorkbook()
    const result = await parseCrmReportBuffer(buffer, new Date("2026-06-15T00:00:00.000Z"))

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.sheetName).toBe("Sheet2")
    expect(result.rows).toHaveLength(2)

    const amPass = result.rows.find((r) => r.workOrderNumber === "WO-AM-1")
    expect(amPass?.adhered).toBe(true)
    expect(amPass?.slotPeriod).toBe("AM")

    const pmPass = result.rows.find((r) => r.workOrderNumber === "WO-PM-1")
    expect(pmPass?.adhered).toBe(true)
    expect(pmPass?.slotPeriod).toBe("PM")
  })

  it("returns UNSUPPORTED when required headers are missing", async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Sheet2")
    ws.addRow(["foo", "bar"])
    const buffer = Buffer.from(await wb.xlsx.writeBuffer())

    const result = await parseCrmReportBuffer(buffer, new Date("2026-06-15T00:00:00.000Z"))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("UNSUPPORTED")
  })
})

async function buildSampleWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Sheet2")
  ws.addRow([
    "id",
    "workordernumber",
    "x",
    "x",
    "x",
    "x",
    "x",
    "appointmentdate",
    "status",
    "skillset",
    "createdate",
    "completiondate",
  ])
  ws.addRow([
    1,
    "WO-AM-1",
    "",
    "",
    "",
    "",
    "",
    "2026-06-13 AM Slot",
    "Completed",
    "Install",
    new Date("2026-06-10T08:00:00.000Z"),
    new Date("2026-06-13T04:00:00.000Z"), // 12:00 Manila
  ])
  ws.addRow([
    2,
    "WO-PM-1",
    "",
    "",
    "",
    "",
    "",
    "2026-06-13 PM Slot",
    "Completed",
    "Repair",
    new Date("2026-06-10T08:00:00.000Z"),
    new Date("2026-06-13T06:00:00.000Z"), // 14:00 Manila
  ])
  return Buffer.from(await wb.xlsx.writeBuffer())
}
