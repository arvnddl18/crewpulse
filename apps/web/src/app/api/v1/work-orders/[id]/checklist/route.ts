import { isChecklistComplete } from "@crewpulse/domain"
import { getWorkOrderChecklist } from "@/db/checklists"
import { getWorkOrderDetail } from "@/db/work-orders"
import { jsonErr, jsonOk } from "@/lib/http"
import { checklistItemCompleteSchema } from "@/lib/schemas"
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
    const checklist = await getWorkOrderChecklist(
      auth.supabase,
      id,
      wo.requiredSkillId,
    )
    return jsonOk({
      templateName: checklist.templateName,
      items: checklist.items,
      complete: isChecklistComplete(checklist.items),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load checklist"
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
  if (
    auth.profile.role === "technician" &&
    wo.assignedTechnicianId !== auth.profile.id
  ) {
    return jsonErr("NOT_ASSIGNEE", "This job is no longer yours")
  }

  const parsed = checklistItemCompleteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body")
  }

  const { data: item } = await auth.supabase
    .from("checklist_items")
    .select("id, requires_photo, is_required")
    .eq("id", parsed.data.itemId)
    .maybeSingle()

  if (!item) {
    return jsonErr("NOT_FOUND", "Checklist item not found")
  }

  if (parsed.data.completed && item.requires_photo && !parsed.data.attachmentId) {
    return jsonErr("VALIDATION", "Photo required for this item")
  }

  const { error } = await auth.supabase.from("work_order_checklist_responses").upsert(
    {
      org_id: auth.profile.orgId,
      work_order_id: id,
      item_id: parsed.data.itemId,
      completed: parsed.data.completed,
      attachment_id: parsed.data.attachmentId ?? null,
      completed_by: parsed.data.completed ? auth.profile.id : null,
      completed_at: parsed.data.completed ? new Date().toISOString() : null,
    },
    { onConflict: "work_order_id,item_id" },
  )

  if (error) {
    return jsonErr("UNKNOWN", error.message)
  }

  const checklist = await getWorkOrderChecklist(auth.supabase, id, wo.requiredSkillId)
  return jsonOk({
    templateName: checklist.templateName,
    items: checklist.items,
    complete: isChecklistComplete(checklist.items),
  })
}
