import type { SupabaseClient } from "@supabase/supabase-js"

export type ShiftItem = {
  id: string
  profileId: string
  profileName: string
  startsAt: string
  endsAt: string
  notes: string | null
}

export async function listShifts(
  supabase: SupabaseClient,
  orgId: string,
  range: { from: string; to: string },
): Promise<ShiftItem[]> {
  const { data, error } = await supabase
    .from("technician_shifts")
    .select(
      "id, profile_id, starts_at, ends_at, notes, profiles!technician_shifts_profile_id_fkey(full_name)",
    )
    .eq("org_id", orgId)
    .gte("starts_at", range.from)
    .lte("starts_at", range.to)
    .order("starts_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    profileId: row.profile_id as string,
    profileName:
      ((row.profiles as { full_name?: string } | null)?.full_name as string) ??
      "Technician",
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    notes: (row.notes as string | null) ?? null,
  }))
}

export async function createShift(
  supabase: SupabaseClient,
  input: {
    orgId: string
    profileId: string
    startsAt: string
    endsAt: string
    notes?: string | null
    createdBy: string
  },
): Promise<ShiftItem> {
  const { data, error } = await supabase
    .from("technician_shifts")
    .insert({
      org_id: input.orgId,
      profile_id: input.profileId,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      notes: input.notes ?? null,
      created_by: input.createdBy,
    })
    .select("id, profile_id, starts_at, ends_at, notes")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create shift")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", input.profileId)
    .maybeSingle()

  return {
    id: data.id as string,
    profileId: data.profile_id as string,
    profileName: (profile?.full_name as string | undefined) ?? "Technician",
    startsAt: data.starts_at as string,
    endsAt: data.ends_at as string,
    notes: (data.notes as string | null) ?? null,
  }
}
