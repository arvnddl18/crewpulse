import type { SupabaseClient } from "@supabase/supabase-js"

export type WorkOrderMessage = {
  id: string
  workOrderId: string
  authorId: string
  authorName: string
  body: string | null
  attachmentId: string | null
  createdAt: string
}

export async function listWorkOrderMessages(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderMessage[]> {
  const { data, error } = await supabase
    .from("work_order_messages")
    .select("id, work_order_id, author_id, body, attachment_id, created_at, profiles(full_name)")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => {
    const profile = row.profiles as { full_name: string } | { full_name: string }[] | null
    const name = Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name
    return {
      id: row.id as string,
      workOrderId: row.work_order_id as string,
      authorId: row.author_id as string,
      authorName: name ?? "Unknown",
      body: (row.body as string | null) ?? null,
      attachmentId: (row.attachment_id as string | null) ?? null,
      createdAt: row.created_at as string,
    }
  })
}

export async function insertWorkOrderMessage(
  supabase: SupabaseClient,
  orgId: string,
  workOrderId: string,
  authorId: string,
  body: string | null,
  attachmentId: string | null,
): Promise<WorkOrderMessage> {
  const { data, error } = await supabase
    .from("work_order_messages")
    .insert({
      org_id: orgId,
      work_order_id: workOrderId,
      author_id: authorId,
      body,
      attachment_id: attachmentId,
    })
    .select("id, work_order_id, author_id, body, attachment_id, created_at")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Could not send message")
  }

  return {
    id: data.id as string,
    workOrderId: data.work_order_id as string,
    authorId: data.author_id as string,
    authorName: "",
    body: (data.body as string | null) ?? null,
    attachmentId: (data.attachment_id as string | null) ?? null,
    createdAt: data.created_at as string,
  }
}
