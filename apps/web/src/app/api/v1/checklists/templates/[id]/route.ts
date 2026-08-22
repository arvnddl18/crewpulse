import { listChecklistTemplates, upsertChecklistTemplate } from "@/db/checklists"
import { jsonErr, jsonOk } from "@/lib/http"
import { putChecklistTemplateSchema } from "@/lib/schemas"
import { requireAdmin, requireUser } from "@/lib/session"

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

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireAdmin(auth)
  if (forbidden) {
    return forbidden
  }

  const { id } = await context.params
  const parsed = putChecklistTemplateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body")
  }

  try {
    await upsertChecklistTemplate(auth.supabase, auth.profile.orgId, id, parsed.data)
    const templates = await listChecklistTemplates(auth.supabase, auth.profile.orgId)
    const updated = templates.find((t) => t.id === id)
    return jsonOk(updated ?? { id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save template"
    return jsonErr("UNKNOWN", message)
  }
}
