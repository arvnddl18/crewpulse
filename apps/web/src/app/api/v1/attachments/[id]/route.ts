import { jsonErr, jsonOk } from "@/lib/http"
import { requireUser } from "@/lib/session"

type RouteContext = { params: Promise<{ id: string }> }

const SIGNED_URL_TTL_SECONDS = 60 * 60

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const { id } = await context.params

  const { data, error } = await auth.supabase
    .from("attachments")
    .select("id, path, mime")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    return jsonErr("UNKNOWN", error.message)
  }
  if (!data) {
    return jsonErr("NOT_FOUND", "Attachment not found")
  }

  const { data: signed, error: signError } = await auth.supabase.storage
    .from("job-attachments")
    .createSignedUrl(data.path as string, SIGNED_URL_TTL_SECONDS)

  if (signError || !signed?.signedUrl) {
    return jsonErr("UNKNOWN", signError?.message ?? "Could not sign URL")
  }

  return jsonOk({
    id: data.id as string,
    url: signed.signedUrl,
    mime: (data.mime as string | null) ?? null,
    expiresIn: SIGNED_URL_TTL_SECONDS,
  })
}
