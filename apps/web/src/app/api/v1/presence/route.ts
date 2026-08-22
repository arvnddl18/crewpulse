import { jsonErr, jsonOk } from "@/lib/http"
import { presenceSchema } from "@/lib/schemas"
import { requireUser } from "@/lib/session"

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const parsed = presenceSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid")
  }

  const { error } = await auth.supabase.from("technician_presence").upsert(
    {
      profile_id: auth.profile.id,
      org_id: auth.profile.orgId,
      status: parsed.data.status,
      current_work_order_id: null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  )

  if (error) {
    return jsonErr("UNKNOWN", error.message)
  }
  return jsonOk({ status: parsed.data.status })
}
