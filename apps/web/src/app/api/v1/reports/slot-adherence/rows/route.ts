import { listSlotAdherenceRows } from "@/db/reports"
import { jsonErr, jsonOk } from "@/lib/http"
import { requireStaff, requireUser } from "@/lib/session"

export async function GET(request: Request): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireStaff(auth)
  if (forbidden) {
    return forbidden
  }

  const url = new URL(request.url)
  const uploadId = url.searchParams.get("uploadId")
  if (!uploadId) {
    return jsonErr("VALIDATION", "uploadId is required")
  }

  try {
    const rows = await listSlotAdherenceRows(auth.supabase, uploadId, {
      skillset: url.searchParams.get("skillset") ?? undefined,
      team: url.searchParams.get("team") ?? undefined,
      adhered: url.searchParams.get("adhered") ?? undefined,
      limit: Number.parseInt(url.searchParams.get("limit") ?? "200", 10),
    })
    return jsonOk(rows)
  } catch (error) {
    return jsonErr(
      "UNKNOWN",
      error instanceof Error ? error.message : "Could not load rows",
    )
  }
}
