import { loadMapPayload } from "@/db/location"
import { jsonErr, jsonOk } from "@/lib/http"
import { requireStaff, requireUser } from "@/lib/session"

export async function GET(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireStaff(auth)
  if (forbidden) {
    return forbidden
  }

  try {
    const payload = await loadMapPayload(auth.supabase, auth.profile)
    return jsonOk(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Map failed"
    return jsonErr("UNKNOWN", message)
  }
}
