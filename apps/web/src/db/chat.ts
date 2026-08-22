import type { SupabaseClient } from "@supabase/supabase-js"

export type ChatThreadRow = {
  id: string
  orgId: string
  kind: string
  title: string | null
  otherName: string
  otherUserId: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

export type ChatMessageRow = {
  id: string
  threadId: string
  authorId: string
  authorName: string
  body: string
  createdAt: string
}

export async function listThreadsForUser(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ChatThreadRow[]> {
  const { data, error } = await supabase
    .from("chat_thread_members")
    .select(`
      thread_id,
      last_read_at,
      chat_threads (
        id, org_id, kind, title, updated_at,
        chat_thread_members ( profile_id, profiles ( id, full_name ) ),
        chat_messages ( body, created_at )
      )
    `)
    .eq("profile_id", profileId)
    .order("joined_at", { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const t = row.chat_threads as Record<string, unknown>
    const members = (t.chat_thread_members ?? []) as Array<{
      profile_id: string
      profiles: { id: string; full_name: string } | null
    }>
    const other = members.find((m) => m.profile_id !== profileId)
    const messages = (t.chat_messages ?? []) as Array<{
      body: string | null
      created_at: string
    }>
    const sorted = [...messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const lastMsg = sorted[0]
    const lastReadAt = new Date(row.last_read_at as string).getTime()
    const unread = messages.filter(
      (m) => new Date(m.created_at).getTime() > lastReadAt,
    ).length

    return {
      id: t.id as string,
      orgId: t.org_id as string,
      kind: t.kind as string,
      title: t.title as string | null,
      otherName: other?.profiles?.full_name ?? "Unknown",
      otherUserId: other?.profiles?.id ?? "",
      lastMessage: lastMsg?.body ?? "",
      lastMessageAt: lastMsg?.created_at ?? (t.updated_at as string),
      unreadCount: unread,
    }
  })
}

export async function getOrCreateDirectThread(
  supabase: SupabaseClient,
  orgId: string,
  _meId: string,
  otherId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_direct_thread", {
    p_org_id: orgId,
    p_other_id: otherId,
  })

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create thread")
  }

  return data as string
}

export async function listThreadMessages(
  supabase: SupabaseClient,
  threadId: string,
): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, thread_id, author_id, body, created_at, profiles(full_name)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const profile = row.profiles as { full_name: string } | { full_name: string }[] | null
    const name = Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name
    return {
      id: row.id as string,
      threadId: row.thread_id as string,
      authorId: row.author_id as string,
      authorName: name ?? "Unknown",
      body: (row.body as string) ?? "",
      createdAt: row.created_at as string,
    }
  })
}

export async function insertChatMessage(
  supabase: SupabaseClient,
  orgId: string,
  threadId: string,
  authorId: string,
  body: string,
): Promise<ChatMessageRow> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ org_id: orgId, thread_id: threadId, author_id: authorId, body })
    .select("id, thread_id, author_id, body, created_at")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Could not send message")
  }

  return {
    id: data.id as string,
    threadId: data.thread_id as string,
    authorId: data.author_id as string,
    authorName: "",
    body: (data.body as string) ?? "",
    createdAt: data.created_at as string,
  }
}

export async function markThreadRead(
  supabase: SupabaseClient,
  threadId: string,
  profileId: string,
): Promise<void> {
  await supabase
    .from("chat_thread_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("profile_id", profileId)
}
