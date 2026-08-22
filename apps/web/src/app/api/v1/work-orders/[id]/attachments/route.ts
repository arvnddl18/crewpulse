import { randomUUID } from "node:crypto"
import { getWorkOrderDetail } from "@/db/work-orders"
import { jsonErr, jsonOk } from "@/lib/http"
import { jobPhotoExtension, validateJobPhoto } from "@/lib/job-photo"
import { requireUser } from "@/lib/session"

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

  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) {
    return jsonErr("VALIDATION", "file is required")
  }

  const checked = validateJobPhoto({ size: file.size, mime: file.type })
  if (!checked.ok) {
    return jsonErr("VALIDATION", checked.message)
  }

  const ext = jobPhotoExtension(checked.mime)
  const objectPath = `${auth.profile.orgId}/${id}/${randomUUID()}.${ext}`

  const { error: uploadError } = await auth.supabase.storage
    .from("job-attachments")
    .upload(objectPath, file, {
      contentType: checked.mime,
      upsert: false,
    })

  if (uploadError) {
    return jsonErr("UNKNOWN", uploadError.message)
  }

  const { data, error } = await auth.supabase
    .from("attachments")
    .insert({
      org_id: auth.profile.orgId,
      work_order_id: id,
      uploaded_by: auth.profile.id,
      path: objectPath,
      mime: checked.mime,
    })
    .select("id, mime, created_at")
    .single()

  if (error || !data) {
    return jsonErr("UNKNOWN", error?.message ?? "Could not save attachment")
  }

  return jsonOk(
    {
      id: data.id as string,
      mime: (data.mime as string | null) ?? checked.mime,
      createdAt: data.created_at as string,
    },
    201,
  )
}
