import { isRole } from "@crewpulse/domain"
import { jsonErr, jsonOk } from "@/lib/http"
import { patchProfileAdminSchema } from "@/lib/schemas"
import { mapProfile, requireAdmin, requireUser } from "@/lib/session"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireAdmin(auth)
  if (forbidden) {
    return forbidden
  }

  const { id } = await context.params
  const parsed = patchProfileAdminSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid")
  }
  if (Object.keys(parsed.data).length === 0) {
    return jsonErr("VALIDATION", "No fields to update")
  }
  if (parsed.data.role !== undefined && !isRole(parsed.data.role)) {
    return jsonErr("VALIDATION", "Invalid role")
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({
      role: parsed.data.role,
      is_active: parsed.data.is_active,
    })
    .eq("id", id)
    .eq("org_id", auth.profile.orgId)
    .select("id, org_id, full_name, email, phone, role, is_active, theme, email_notifications, location_sharing_opt_in")
    .single()

  if (error || !data) {
    return jsonErr("UNKNOWN", error?.message ?? "Update failed")
  }

  return jsonOk(
    mapProfile(
      data as {
        id: string
        org_id: string
        full_name: string
        email: string
        phone: string | null
        role: string
        is_active: boolean
        theme: string
        email_notifications: boolean
        location_sharing_opt_in: boolean
      },
    ),
  )
}
