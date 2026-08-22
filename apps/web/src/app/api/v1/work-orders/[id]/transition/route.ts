import { canTransition, isWorkOrderStatus } from "@crewpulse/domain"
import { getWorkOrderDetail } from "@/db/work-orders"
import { jsonErr, jsonOk } from "@/lib/http"
import { transitionWorkOrderSchema } from "@/lib/schemas"
import { rpcErrorCode } from "@/lib/rpc-error"
import { requireUser } from "@/lib/session"
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
  const { id } = await context.params
  const parsed = transitionWorkOrderSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid")
  }

  const existing = await getWorkOrderDetail(auth.supabase, id)
  if (!existing) {
    return jsonErr("NOT_FOUND", "Work order not found")
  }
  if (
    auth.profile.role === "technician" &&
    existing.assignedTechnicianId !== auth.profile.id
  ) {
    return jsonErr("NOT_ASSIGNEE", "This job is no longer yours")
  }
  if (!canTransition(existing.status, parsed.data.to, auth.profile.role)) {
    return jsonErr(
      "ILLEGAL_TRANSITION",
      `Cannot go from ${existing.status} to ${parsed.data.to}`,
    )
  }

  const { data, error } = await auth.supabase.rpc("transition_work_order", {
    p_wo: id,
    p_to: parsed.data.to,
    p_note: parsed.data.note ?? null,
  })

  if (error) {
    const mapped = rpcErrorCode(error)
    return jsonErr(mapped.code, mapped.message)
  }

  const row = data as { id: string; number: string; status: string }
  const status = row.status
  if (!isWorkOrderStatus(status)) {
    return jsonErr("UNKNOWN", "Invalid status returned")
  }
  scheduleEmailFlush(auth.profile.orgId)
  return jsonOk({ id: row.id, number: row.number, status })
}
