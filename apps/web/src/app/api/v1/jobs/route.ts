import { listWorkOrders } from "@/db/work-orders"
import { jsonErr, jsonOk } from "@/lib/http"
import { requireTechnician, requireUser } from "@/lib/session"

export async function GET(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireTechnician(auth)
  if (forbidden) {
    return forbidden
  }
  try {
    const rows = await listWorkOrders(auth.supabase, auth.profile.orgId, {})
    const mine = rows.filter(
      (row) => row.assignedTechnicianId === auth.profile.id,
    )
    return jsonOk(mine)
  } catch (error) {
    return jsonErr(
      "UNKNOWN",
      error instanceof Error ? error.message : "List failed",
    )
  }
}
