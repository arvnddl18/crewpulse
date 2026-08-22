import { listThreadsForUser, getOrCreateDirectThread } from "@/db/chat"
import { jsonErr, jsonOk } from "@/lib/http"
import { requireUser } from "@/lib/session"
import { z } from "zod"

export async function GET(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  try {
    const threads = await listThreadsForUser(auth.supabase, auth.profile.id)
    return jsonOk(threads)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not load threads"
    return jsonErr("UNKNOWN", msg)
  }
}

const createThreadSchema = z
  .object({ otherUserId: z.string().uuid() })
  .strict()

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const parsed = createThreadSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body")
  }

  if (parsed.data.otherUserId === auth.profile.id) {
    return jsonErr("VALIDATION", "Cannot message yourself")
  }

  try {
    const threadId = await getOrCreateDirectThread(
      auth.supabase,
      auth.profile.orgId,
      auth.profile.id,
      parsed.data.otherUserId,
    )
    return jsonOk({ threadId }, 201)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not create thread"
    return jsonErr("UNKNOWN", msg)
  }
}
