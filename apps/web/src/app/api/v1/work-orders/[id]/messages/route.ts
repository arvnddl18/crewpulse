import { listWorkOrderMessages, insertWorkOrderMessage } from "@/db/messages"
import { getWorkOrderDetail } from "@/db/work-orders"
import { jsonErr, jsonOk } from "@/lib/http"
import { workOrderMessageSchema } from "@/lib/schemas"
import { requireUser } from "@/lib/session"

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

  const wo = await getWorkOrderDetail(auth.supabase, id)
  if (!wo) {
    return jsonErr("NOT_FOUND", "Work order not found")
  }

  try {
    const messages = await listWorkOrderMessages(auth.supabase, id)
    return jsonOk(messages)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load messages"
    return jsonErr("UNKNOWN", message)
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const { id } = await context.params

  const wo = await getWorkOrderDetail(auth.supabase, id)
  if (!wo) {
    return jsonErr("NOT_FOUND", "Work order not found")
  }

  const parsed = workOrderMessageSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body")
  }

  if (parsed.data.attachmentId) {
    const { data: attachment } = await auth.supabase
      .from("attachments")
      .select("id, work_order_id")
      .eq("id", parsed.data.attachmentId)
      .maybeSingle()
    if (!attachment || attachment.work_order_id !== id) {
      return jsonErr("VALIDATION", "Invalid attachment")
    }
  }

  try {
    const message = await insertWorkOrderMessage(
      auth.supabase,
      auth.profile.orgId,
      id,
      auth.profile.id,
      parsed.data.body ?? null,
      parsed.data.attachmentId ?? null,
    )
    return jsonOk({ ...message, authorName: auth.profile.fullName }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send message"
    return jsonErr("UNKNOWN", message)
  }
}
