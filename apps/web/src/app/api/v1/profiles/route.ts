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
    .from("profiles")
    .select("id, full_name, email, phone, role, is_active")
    .eq("org_id", auth.profile.orgId)
    .order("full_name")

  if (error) {
    return jsonErr("UNKNOWN", error.message)
  }

  return jsonOk(
    (data ?? []).map((row) => ({
      id: row.id as string,
      fullName: row.full_name as string,
      email: row.email as string,
      phone: (row.phone as string | null) ?? null,
      role: row.role as string,
      isActive: row.is_active as boolean,
    })),
  )
}
