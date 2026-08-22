import { jsonErr, jsonOk } from "@/lib/http"
import { requireUser } from "@/lib/session"

export async function GET(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  return jsonOk(auth.profile)
}

export async function PATCH(request: Request): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const { patchMeSchema } = await import("@/lib/schemas")
  const parsed = patchMeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body")
  }
  const body: Record<string, unknown> = {}
  if (parsed.data.full_name !== undefined) body.full_name = parsed.data.full_name
  if (parsed.data.phone !== undefined) body.phone = parsed.data.phone
  if (parsed.data.theme !== undefined) body.theme = parsed.data.theme
  if (parsed.data.email_notifications !== undefined) {
    body.email_notifications = parsed.data.email_notifications
  }
  if (parsed.data.location_sharing_opt_in !== undefined) {
    body.location_sharing_opt_in = parsed.data.location_sharing_opt_in
  }
  if (Object.keys(body).length === 0) {
    return jsonErr("VALIDATION", "No fields to update")
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update(body)
    .eq("id", auth.profile.id)
    .select("id, org_id, full_name, email, phone, role, is_active, theme, email_notifications, location_sharing_opt_in")
    .single()
  if (error || !data) {
    return jsonErr("UNKNOWN", "Could not update profile")
  }
  const { mapProfile } = await import("@/lib/session")
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
