import { jsonErr, jsonOk } from "@/lib/http"
import { requireUser } from "@/lib/session"

export async function POST(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }

  const { data: existing } = await auth.supabase
    .from("technician_presence")
    .select("status, current_work_order_id")
    .eq("profile_id", auth.profile.id)
    .maybeSingle()

  const status =
    (existing?.status as string | undefined) ??
    (auth.profile.role === "technician" ? "available" : "offline")

  const { error } = await auth.supabase.from("technician_presence").upsert(
    {
      profile_id: auth.profile.id,
      org_id: auth.profile.orgId,
      status,
      current_work_order_id:
        (existing?.current_work_order_id as string | null) ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  )

  if (error) {
    return jsonErr("UNKNOWN", error.message)
  }
  return jsonOk({ ok: true })
}
