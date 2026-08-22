import { jsonErr, jsonOk } from "@/lib/http"
import { assignWorkOrderSchema } from "@/lib/schemas"
import { rpcErrorCode } from "@/lib/rpc-error"
import { requireStaff, requireUser } from "@/lib/session"
import { scheduleEmailFlush } from "@/services/schedule-email-flush"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(
  request: Request,
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
  const parsed = assignWorkOrderSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid")
  }

  const { data, error } = await auth.supabase.rpc("assign_work_order", {
    p_wo: id,
    p_tech: parsed.data.technicianId,
  })

  if (error) {
    const mapped = rpcErrorCode(error)
    return jsonErr(mapped.code, mapped.message)
  }

  const row = data as { id: string; number: string; status: string }
  scheduleEmailFlush(auth.profile.orgId)
  return jsonOk({
    id: row.id,
    number: row.number,
    status: row.status,
    assignedTechnicianId: parsed.data.technicianId,
  })
}
