import { jsonErr, jsonOk } from "@/lib/http"
import { requireUser } from "@/lib/session"

export async function GET(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("org_id", auth.profile.orgId)
    .eq("is_active", true)
    .neq("id", auth.profile.id)
    .order("full_name")

  if (error) {
    return jsonErr("UNKNOWN", error.message)
  }

  return jsonOk(
    (data ?? []).map((row) => ({
      id: row.id as string,
      fullName: row.full_name as string,
      role: row.role as string,
    })),
  )
}
