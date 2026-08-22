import { listThreadMessages, insertChatMessage, markThreadRead } from "@/db/chat"
import { jsonErr, jsonOk } from "@/lib/http"
import { requireUser } from "@/lib/session"
import { z } from "zod"

type RouteContext = { params: Promise<{ threadId: string }> }

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) return auth.response
  const { threadId } = await context.params

  try {
    const messages = await listThreadMessages(auth.supabase, threadId)
    await markThreadRead(auth.supabase, threadId, auth.profile.id)
    return jsonOk(messages)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not load messages"
    return jsonErr("UNKNOWN", msg)
  }
}

const sendSchema = z
  .object({ body: z.string().trim().min(1).max(4000) })
  .strict()

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) return auth.response
  const { threadId } = await context.params

  const parsed = sendSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return jsonErr("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body")
  }

  try {
    const message = await insertChatMessage(
      auth.supabase,
      auth.profile.orgId,
      threadId,
      auth.profile.id,
      parsed.data.body,
    )
    return jsonOk({ ...message, authorName: auth.profile.fullName }, 201)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not send message"
    return jsonErr("UNKNOWN", msg)
  }
}
