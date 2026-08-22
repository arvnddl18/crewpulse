import { isGpsTrackingStatus } from "@crewpulse/domain"
import { getWorkOrderDetail } from "@/db/work-orders"
import { insertLocationPing } from "@/db/location"
import { jsonErr, jsonOk } from "@/lib/http"
import { locationPingSchema } from "@/lib/schemas"
import { requireTechnician, requireUser } from "@/lib/session"

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireTechnician(auth)
  if (forbidden) {
    return forbidden
  }

  const parsed = locationPingSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body")
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("location_sharing_opt_in")
    .eq("id", auth.profile.id)
    .single()

  if (!profile?.location_sharing_opt_in) {
    return jsonErr("FORBIDDEN", "Location sharing is not enabled")
  }

  const wo = await getWorkOrderDetail(auth.supabase, parsed.data.workOrderId)
  if (!wo) {
    return jsonErr("NOT_FOUND", "Work order not found")
  }
  if (wo.assignedTechnicianId !== auth.profile.id) {
    return jsonErr("NOT_ASSIGNEE", "Not your active job")
  }
  if (!isGpsTrackingStatus(wo.status)) {
    return jsonErr("FORBIDDEN", "GPS not allowed for this job status")
  }

  try {
    await insertLocationPing(
      auth.supabase,
      auth.profile.orgId,
      auth.profile.id,
      parsed.data.workOrderId,
      parsed.data.lat,
      parsed.data.lng,
      parsed.data.accuracyM ?? null,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record location"
    return jsonErr("UNKNOWN", message)
  }

  return jsonOk({ ok: true })
}
