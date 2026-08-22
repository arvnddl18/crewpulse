import {
  getReportUpload,
  replaceOrgReport,
} from "@/db/reports"
import { jsonErr, jsonOk } from "@/lib/http"
import { requireStaff, requireUser } from "@/lib/session"
import {
  asOfDateForUpload,
  parseCrmReportBuffer,
} from "@/services/parse-crm-report"
import { parseAsOfDateFromFilename } from "@crewpulse/domain"

const MAX_BYTES = 10 * 1024 * 1024
const XLSX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
])

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireStaff(auth)
  if (forbidden) {
    return forbidden
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) {
    return jsonErr("VALIDATION", "file is required")
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return jsonErr("VALIDATION", "File must be between 1 byte and 10 MB")
  }

  const mime = file.type || guessMime(file.name)
  if (!XLSX_TYPES.has(mime)) {
    return jsonErr("VALIDATION", "Only Excel all-status exports (.xlsx) are supported")
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const asOfDate = asOfDateForUpload(file.name)
  const asOfDateText = parseAsOfDateFromFilename(file.name)

  const parsed = await parseCrmReportBuffer(buffer, asOfDate)
  if (!parsed.ok) {
    return jsonErr(parsed.code, parsed.message)
  }

  try {
    const { upload, rowCount } = await replaceOrgReport(auth.supabase, {
      orgId: auth.profile.orgId,
      uploadedBy: auth.profile.id,
      originalFilename: file.name,
      asOfDate: asOfDateText,
      rows: parsed.rows,
    })

    const ready = await getReportUpload(auth.supabase, upload.id)
    return jsonOk(
      {
        upload: ready,
        rowCount,
        sheetName: parsed.sheetName,
        replaced: true,
      },
      201,
    )
  } catch (error) {
    return jsonErr(
      "UNKNOWN",
      error instanceof Error ? error.message : "Could not save report",
    )
  }
}

function guessMime(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  }
  if (lower.endsWith(".xls")) {
    return "application/vnd.ms-excel"
  }
  return "application/octet-stream"
}
