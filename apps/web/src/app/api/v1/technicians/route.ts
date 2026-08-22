import { jsonErr, jsonOk } from "@/lib/http"
import { requireStaff, requireUser } from "@/lib/session"

export async function GET(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireStaff(auth)
  if (forbidden) {
    return forbidden
  }

  const { data: profiles, error } = await auth.supabase
    .from("profiles")
    .select("id, full_name, is_active, role")
    .eq("org_id", auth.profile.orgId)
    .eq("role", "technician")
    .eq("is_active", true)
    .order("full_name")

  if (error) {
    return jsonErr("UNKNOWN", error.message)
  }

  const { data: presenceRows } = await auth.supabase
    .from("technician_presence")
    .select("profile_id, status, last_seen_at")
    .eq("org_id", auth.profile.orgId)

  const { data: memberRows } = await auth.supabase
    .from("team_members")
    .select("profile_id, team_id, is_primary")
    .eq("is_primary", true)

  const { data: skillLinks } = await auth.supabase
    .from("technician_skills")
    .select("profile_id, skill_id")

  const { data: skills } = await auth.supabase
    .from("skills")
    .select("id, name")
    .eq("org_id", auth.profile.orgId)

  const skillName = new Map(
    (skills ?? []).map((s) => [s.id as string, s.name as string]),
  )
  const skillsByProfile = new Map<string, string[]>()
  for (const link of skillLinks ?? []) {
    const name = skillName.get(link.skill_id as string)
    if (!name) continue
    const list = skillsByProfile.get(link.profile_id as string) ?? []
    list.push(name)
    skillsByProfile.set(link.profile_id as string, list)
  }

  const presenceById = new Map(
    (presenceRows ?? []).map((p) => [p.profile_id as string, p]),
  )
  const teamByProfile = new Map(
    (memberRows ?? []).map((m) => [m.profile_id as string, m.team_id as string]),
  )

  const technicians = (profiles ?? []).map((p) => {
    const id = p.id as string
    const pres = presenceById.get(id)
    return {
      id,
      fullName: p.full_name as string,
      teamId: teamByProfile.get(id) ?? null,
      presence: (pres?.status as string) ?? "offline",
      lastSeenAt: (pres?.last_seen_at as string) ?? null,
      skills: skillsByProfile.get(id) ?? [],
    }
  })

  return jsonOk(technicians)
}
