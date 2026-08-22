import { flushEmailOutbox } from "@/services/email-outbox"
import { jsonErr, jsonOk } from "@/lib/http"
import { createServiceSupabaseClient } from "@/lib/supabase/service"

export async function POST(request: Request): Promise<Response> {
  const cronSecret = process.env.EMAIL_CRON_SECRET?.trim()
  if (cronSecret) {
    const header = request.headers.get("authorization")
    if (header !== `Bearer ${cronSecret}`) {
      return jsonErr("FORBIDDEN", "Invalid cron secret", 403)
    }
  }

  try {
    const supabase = createServiceSupabaseClient()
    const result = await flushEmailOutbox(supabase)
    return jsonOk(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email flush failed"
    return jsonErr("UNKNOWN", message)
  }
}
