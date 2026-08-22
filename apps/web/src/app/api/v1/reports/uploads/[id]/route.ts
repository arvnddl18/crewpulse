import { getReportUpload } from "@/db/reports"
import { jsonErr, jsonOk } from "@/lib/http"
import { requireStaff, requireUser } from "@/lib/session"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireStaff(auth)
  if (forbidden) {
    return forbidden
  }

  const { id } = await context.params
  try {
    const upload = await getReportUpload(auth.supabase, id)
    if (!upload) {
      return jsonErr("NOT_FOUND", "Upload not found")
    }
    return jsonOk(upload)
  } catch (error) {
    return jsonErr(
      "UNKNOWN",
      error instanceof Error ? error.message : "Could not load upload",
    )
  }
}
