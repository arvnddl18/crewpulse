import type { SupabaseClient } from "@supabase/supabase-js"
import type { SessionProfile } from "@/lib/session"
import { isStaffRole } from "@crewpulse/domain"

export type MapTechnicianDot = {
  profileId: string
  fullName: string
  teamColor: string
  workOrderId: string
  workOrderNumber: string
  lat: number
  lng: number
  recordedAt: string
  ageSeconds: number
}

export type MapSitePin = {
  workOrderId: string
  number: string
  title: string
  lat: number
  lng: number
  siteAddress: string
}

export type MapPayload = {
  technicians: MapTechnicianDot[]
  sites: MapSitePin[]
}

function joinedOne<T>(value: T | T[] | null | undefined): T | null {
  if (value === null || value === undefined) {
    return null
  }
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function insertLocationPing(
  supabase: SupabaseClient,
  orgId: string,
  profileId: string,
  workOrderId: string,
  lat: number,
  lng: number,
  accuracyM: number | null,
): Promise<void> {
  const { error } = await supabase.from("technician_location_pings").insert({
    org_id: orgId,
    profile_id: profileId,
    work_order_id: workOrderId,
    lat,
    lng,
    accuracy_m: accuracyM,
    recorded_at: new Date().toISOString(),
  })
  if (error) {
    throw new Error(error.message)
  }
}

export async function loadMapPayload(
  supabase: SupabaseClient,
  profile: SessionProfile,
): Promise<MapPayload> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  let pingQuery = supabase
    .from("technician_location_pings")
    .select(
      "profile_id, work_order_id, lat, lng, recorded_at, profiles(full_name), work_orders(number, team_id, teams(color))",
    )
    .eq("org_id", profile.orgId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: false })

  const { data: pings, error } = await pingQuery
  if (error) {
    throw new Error(error.message)
  }

  const leadTeams =
    profile.role === "team_lead"
      ? await supabase.rpc("lead_team_ids").then((r) => (r.data as string[]) ?? [])
      : null

  type PingRow = {
    profile_id: string
    work_order_id: string
    lat: number
    lng: number
    recorded_at: string
    profiles: { full_name: string } | { full_name: string }[] | null
    work_orders:
      | {
          number: string
          team_id: string | null
          teams: { color: string } | { color: string }[] | null
        }
      | Array<{
          number: string
          team_id: string | null
          teams: { color: string } | { color: string }[] | null
        }>
      | null
  }

  const latestByTech = new Map<string, PingRow>()
  for (const row of (pings ?? []) as PingRow[]) {
    const pid = row.profile_id
    if (latestByTech.has(pid)) {
      continue
    }
    const wo = joinedOne(row.work_orders)
    if (profile.role === "team_lead" && leadTeams) {
      const teamId = wo?.team_id
      if (!teamId || !leadTeams.includes(teamId)) {
        continue
      }
    }
    latestByTech.set(pid, row)
  }

  const now = Date.now()
  const technicians: MapTechnicianDot[] = []
  for (const row of latestByTech.values()) {
    const prof = joinedOne(row.profiles)
    const wo = joinedOne(row.work_orders)
    const team = joinedOne(wo?.teams ?? null)
    const recordedAt = row.recorded_at
    technicians.push({
      profileId: row.profile_id,
      fullName: prof?.full_name ?? "Technician",
      teamColor: team?.color ?? "teal",
      workOrderId: row.work_order_id,
      workOrderNumber: wo?.number ?? "",
      lat: Number(row.lat),
      lng: Number(row.lng),
      recordedAt,
      ageSeconds: Math.round((now - new Date(recordedAt).getTime()) / 1000),
    })
  }

  let woQuery = supabase
    .from("work_orders")
    .select("id, number, title, site_address, site_lat, site_lng, team_id, status")
    .eq("org_id", profile.orgId)
    .in("status", ["accepted", "en_route", "on_site", "in_progress", "paused"])
    .not("site_lat", "is", null)
    .not("site_lng", "is", null)

  if (profile.role === "team_lead" && leadTeams && leadTeams.length > 0) {
    woQuery = woQuery.in("team_id", leadTeams)
  }

  const { data: workOrders } = await woQuery

  const sites: MapSitePin[] = (workOrders ?? []).map((wo) => ({
    workOrderId: wo.id as string,
    number: wo.number as string,
    title: wo.title as string,
    lat: Number(wo.site_lat),
    lng: Number(wo.site_lng),
    siteAddress: wo.site_address as string,
  }))

  return { technicians, sites }
}

export function staffCanViewMap(role: SessionProfile["role"]): boolean {
  return isStaffRole(role)
}
