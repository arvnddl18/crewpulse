import { createShift, listShifts } from "@/db/shifts"
import { jsonErr, jsonOk } from "@/lib/http"
import { createShiftSchema } from "@/lib/schemas"
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
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  if (!from || !to) {
    return jsonErr("VALIDATION", "from and to are required")
  }

  try {
    const shifts = await listShifts(auth.supabase, auth.profile.orgId, { from, to })
    return jsonOk(shifts)
  } catch (error) {
    return jsonErr(
      "UNKNOWN",
      error instanceof Error ? error.message : "Could not load shifts",
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

  const parsed = createShiftSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return jsonErr("VALIDATION", issue?.message ?? "Invalid shift")
  }

  try {
    const shift = await createShift(auth.supabase, {
      orgId: auth.profile.orgId,
      profileId: parsed.data.profile_id,
      startsAt: parsed.data.starts_at,
      endsAt: parsed.data.ends_at,
      notes: parsed.data.notes ?? null,
      createdBy: auth.profile.id,
    })
    return jsonOk(shift, 201)
  } catch (error) {
    return jsonErr(
      "UNKNOWN",
      error instanceof Error ? error.message : "Could not create shift",
    )
  }
}
