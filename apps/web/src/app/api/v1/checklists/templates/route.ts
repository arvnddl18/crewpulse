import { listChecklistTemplates } from "@/db/checklists"
import { jsonErr, jsonOk } from "@/lib/http"
import { requireUser } from "@/lib/session"

export async function GET(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }

  try {
    const templates = await listChecklistTemplates(auth.supabase, auth.profile.orgId)
    return jsonOk(templates)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load templates"
    return jsonErr("UNKNOWN", message)
  }
}
