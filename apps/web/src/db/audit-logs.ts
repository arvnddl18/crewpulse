import type { SupabaseClient } from "@supabase/supabase-js"
import type { AuditLogRow } from "@/lib/types"

type AuditLogDbRow = {
  id: string
  actor_id: string | null
  action: string
  entity: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  profiles: { full_name: string } | { full_name: string }[] | null
}

function actorNameFromJoin(
  profiles: AuditLogDbRow["profiles"],
): string | null {
  if (!profiles) {
    return null
  }
  if (Array.isArray(profiles)) {
    return profiles[0]?.full_name ?? null
  }
  return profiles.full_name
}

export async function listAuditLogs(
  supabase: SupabaseClient,
  orgId: string,
  limit = 100,
): Promise<AuditLogRow[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      "id, actor_id, action, entity, entity_id, metadata, created_at, profiles(full_name)",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as AuditLogDbRow[]).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: actorNameFromJoin(row.profiles),
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }))
}
