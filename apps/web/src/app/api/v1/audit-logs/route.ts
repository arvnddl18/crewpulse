import { listAuditLogs } from "@/db/audit-logs"
import { jsonErr, jsonOk } from "@/lib/http"
import { requireAdmin, requireUser } from "@/lib/session"

export async function GET(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireAdmin(auth)
  if (forbidden) {
    return forbidden
  }

  try {
    const logs = await listAuditLogs(auth.supabase, auth.profile.orgId)
    return jsonOk(logs)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audit logs failed"
    return jsonErr("UNKNOWN", message)
  }
}
