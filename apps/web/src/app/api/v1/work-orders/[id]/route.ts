import { getWorkOrderDetail } from "@/db/work-orders"
import { jsonErr, jsonOk } from "@/lib/http"
import { patchWorkOrderSchema } from "@/lib/schemas"
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
  const { id } = await context.params
  try {
    const detail = await getWorkOrderDetail(auth.supabase, id)
    if (!detail) {
      return jsonErr("NOT_FOUND", "Work order not found")
    }
    return jsonOk(detail)
  } catch (error) {
    return jsonErr(
      "UNKNOWN",
      error instanceof Error ? error.message : "Load failed",
    )
  }
}

export async function PATCH(
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
  const parsed = patchWorkOrderSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid")
  }
  if (Object.keys(parsed.data).length === 0) {
    return jsonErr("VALIDATION", "No fields to update")
  }

  const existing = await getWorkOrderDetail(auth.supabase, id)
  if (!existing) {
    return jsonErr("NOT_FOUND", "Work order not found")
  }

  const body: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) body.title = parsed.data.title
  if (parsed.data.description !== undefined) body.description = parsed.data.description
  if (parsed.data.priority !== undefined) body.priority = parsed.data.priority
  if (parsed.data.customer_name !== undefined) body.customer_name = parsed.data.customer_name
  if (parsed.data.customer_phone !== undefined) body.customer_phone = parsed.data.customer_phone
  if (parsed.data.site_address !== undefined) body.site_address = parsed.data.site_address
  if (parsed.data.work_order_type !== undefined) body.work_order_type = parsed.data.work_order_type
  if (parsed.data.order_action_type !== undefined) body.order_action_type = parsed.data.order_action_type
  if (parsed.data.required_skill_id !== undefined) body.required_skill_id = parsed.data.required_skill_id
  if (parsed.data.team_id !== undefined) body.team_id = parsed.data.team_id
  if (parsed.data.scheduled_start !== undefined) body.scheduled_start = parsed.data.scheduled_start
  if (parsed.data.scheduled_end !== undefined) {
    body.scheduled_end = parsed.data.scheduled_end
    if (parsed.data.due_at === undefined) {
      body.due_at = parsed.data.scheduled_end
    }
  }
  if (parsed.data.due_at !== undefined) body.due_at = parsed.data.due_at

  const { data, error } = await auth.supabase
    .from("work_orders")
    .update(body)
    .eq("id", id)
    .select("id, number, status")
    .single()

  if (error || !data) {
    return jsonErr("UNKNOWN", error?.message ?? "Update failed")
  }
  return jsonOk({
    id: data.id as string,
    number: data.number as string,
    status: data.status as string,
  })
}
