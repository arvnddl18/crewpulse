import { jsonErr, jsonOk } from "@/lib/http"
import { requireUser } from "@/lib/session"

export async function POST(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }

  const { error } = await auth.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", auth.profile.id)
    .is("read_at", null)

  if (error) {
    return jsonErr("UNKNOWN", error.message)
  }
  return jsonOk({ ok: true })
}
