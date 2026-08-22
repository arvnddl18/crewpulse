import {
  getLatestReadyUploadId,
  loadSlotAdherenceAggregate,
} from "@/db/reports"
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
  let uploadId = url.searchParams.get("uploadId")
  if (!uploadId) {
    uploadId = await getLatestReadyUploadId(auth.supabase, auth.profile.orgId)
  }
  if (!uploadId) {
    return jsonOk(null)
  }

  try {
    const aggregate = await loadSlotAdherenceAggregate(auth.supabase, uploadId)
    if (!aggregate) {
      return jsonErr("NOT_FOUND", "Upload not found")
    }
    return jsonOk(aggregate)
  } catch (error) {
    return jsonErr(
      "UNKNOWN",
      error instanceof Error ? error.message : "Could not load report",
    )
  }
}
