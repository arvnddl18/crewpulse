import { jsonErr, jsonOk } from "@/lib/http"
import { requireUser } from "@/lib/session"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const { id } = await context.params

  const { error } = await auth.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profile_id", auth.profile.id)

  if (error) {
    return jsonErr("UNKNOWN", error.message)
  }
  return jsonOk({ id })
}
