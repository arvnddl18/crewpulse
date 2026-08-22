import { jsonErr, jsonOk } from "@/lib/http"
import { requireStaff, requireUser } from "@/lib/session"

export async function GET(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireStaff(auth)
  if (forbidden) {
    return forbidden
  }

  const { data, error } = await auth.supabase
    .from("teams")
    .select("id, name, color, lead_id")
    .eq("org_id", auth.profile.orgId)
    .order("name")

  if (error) {
    return jsonErr("UNKNOWN", error.message)
  }

  return jsonOk(
    (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      color: row.color as string,
      leadId: (row.lead_id as string | null) ?? null,
    })),
  )
}
