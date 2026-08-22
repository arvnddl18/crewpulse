import { jsonErr, jsonOk } from "@/lib/http"
import { requireUser } from "@/lib/session"

export async function GET(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }

  const { data, error } = await auth.supabase
    .from("notifications")
    .select("id, type, title, body, work_order_id, read_at, created_at")
    .eq("profile_id", auth.profile.id)
    .order("created_at", { ascending: false })
    .limit(30)

  if (error) {
    return jsonErr("UNKNOWN", error.message)
  }

  return jsonOk(
    (data ?? []).map((row) => ({
      id: row.id as string,
      type: row.type as string,
      title: row.title as string,
      body: (row.body as string | null) ?? null,
      workOrderId: (row.work_order_id as string | null) ?? null,
      readAt: (row.read_at as string | null) ?? null,
      createdAt: row.created_at as string,
    })),
  )
}
