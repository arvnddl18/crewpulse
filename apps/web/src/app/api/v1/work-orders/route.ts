import { listWorkOrders } from "@/db/work-orders"
import { jsonErr, jsonOk } from "@/lib/http"
import { createWorkOrderSchema } from "@/lib/schemas"
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
  try {
    const rows = await listWorkOrders(auth.supabase, auth.profile.orgId, {
      status: url.searchParams.get("status") ?? undefined,
      team: url.searchParams.get("team") ?? undefined,
      priority: url.searchParams.get("priority") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      overdue: url.searchParams.get("overdue") === "true",
    })
    return jsonOk(rows)
  } catch (error) {
    return jsonErr(
      "UNKNOWN",
      error instanceof Error ? error.message : "List failed",
    )
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireStaff(auth)
  if (forbidden) {
    return forbidden
  }
  const parsed = createWorkOrderSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return jsonErr("VALIDATION", issue?.message ?? "Invalid work order")
  }

  const { data, error } = await auth.supabase
    .from("work_orders")
    .insert({
      org_id: auth.profile.orgId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: "queued",
      priority: parsed.data.priority,
      work_order_type: parsed.data.work_order_type,
      order_action_type: parsed.data.order_action_type ?? null,
      customer_name: parsed.data.customer_name ?? null,
      customer_phone: parsed.data.customer_phone ?? null,
      site_address: parsed.data.site_address,
      required_skill_id: parsed.data.required_skill_id ?? null,
      team_id: parsed.data.team_id ?? null,
      scheduled_start: parsed.data.scheduled_start ?? null,
      scheduled_end: parsed.data.scheduled_end ?? null,
      due_at: parsed.data.scheduled_end ?? parsed.data.due_at ?? null,
      created_by: auth.profile.id,
    })
    .select("id, number, status")
    .single()

  if (error || !data) {
    return jsonErr("UNKNOWN", error?.message ?? "Could not create work order")
  }
  return jsonOk(
    {
      id: data.id as string,
      number: data.number as string,
      status: data.status as string,
    },
    201,
  )
}
