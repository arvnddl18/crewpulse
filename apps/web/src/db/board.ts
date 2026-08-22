import {
  displayPresence,
  isPresenceStatus,
  isTerminalStatus,
  isWorkOrderPriority,
  isWorkOrderStatus,
  type PresenceStatus,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@crewpulse/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { SessionProfile } from "@/lib/session"

export type BoardTechnician = {
  id: string
  fullName: string
  teamId: string | null
  teamName: string | null
  teamColor: string
  presence: PresenceStatus
  lastSeenAt: string
  currentWorkOrder: {
    id: string
    number: string
    title: string
  } | null
  skills: string[]
}

export type BoardWorkOrder = {
  id: string
  number: string
  title: string
  status: WorkOrderStatus
  priority: WorkOrderPriority
  teamId: string | null
  assignedTechnicianId: string | null
  assignedName: string | null
  siteAddress: string
  requiredSkillName: string | null
  dueAt: string | null
  overdue: boolean
}

const ACTIVE_BOARD_STATUSES = [
  "draft",
  "queued",
  "assigned",
  "accepted",
  "en_route",
  "on_site",
  "in_progress",
  "paused",
  "needs_followup",
] as const

export async function loadBoard(
  supabase: SupabaseClient,
  profile: SessionProfile,
): Promise<{ technicians: BoardTechnician[]; workOrders: BoardWorkOrder[] }> {
  const [
    { data: techRows, error: techError },
    { data: presenceRows, error: presenceError },
    { data: teamRows },
    { data: skillRows },
    { data: workOrderRows, error: woError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, is_active, role")
      .eq("org_id", profile.orgId)
      .eq("role", "technician")
      .eq("is_active", true),
    supabase
      .from("technician_presence")
      .select("profile_id, status, last_seen_at, current_work_order_id")
      .eq("org_id", profile.orgId),
    supabase
      .from("teams")
      .select("id, name, color, lead_id")
      .eq("org_id", profile.orgId),
    supabase
      .from("skills")
      .select("id, name")
      .eq("org_id", profile.orgId),
    supabase
      .from("work_orders")
      .select(
        "id, number, title, status, priority, team_id, assigned_technician_id, site_address, required_skill_id, due_at",
      )
      .eq("org_id", profile.orgId)
      .in("status", [...ACTIVE_BOARD_STATUSES])
      .order("created_at", { ascending: false })
      .limit(80),
  ])

  if (techError) {
    throw new Error(techError.message)
  }
  if (presenceError) {
    throw new Error(presenceError.message)
  }
  if (woError) {
    throw new Error(woError.message)
  }

  const techIds = (techRows ?? []).map((row) => row.id as string)
  const skillIds = (skillRows ?? []).map((row) => row.id as string)

  let memberRows: Array<{ profile_id: string; team_id: string; is_primary: boolean }> = []
  let skillLinkRows: Array<{ profile_id: string; skill_id: string }> = []

  if (techIds.length > 0) {
    const [membersResult, skillsResult] = await Promise.all([
      supabase
        .from("team_members")
        .select("profile_id, team_id, is_primary")
        .eq("is_primary", true)
        .in("profile_id", techIds),
      skillIds.length > 0
        ? supabase
            .from("technician_skills")
            .select("profile_id, skill_id")
            .in("skill_id", skillIds)
            .in("profile_id", techIds)
        : Promise.resolve({ data: [] as never[], error: null }),
    ])
    memberRows = (membersResult.data ?? []) as typeof memberRows
    skillLinkRows = (skillsResult.data ?? []) as typeof skillLinkRows
  }

  const teams = new Map(
    (teamRows ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        name: row.name as string,
        color: row.color as string,
        leadId: (row.lead_id as string | null) ?? null,
      },
    ]),
  )

  let leadTeamIds: Set<string> | null = null
  if (profile.role === "team_lead") {
    leadTeamIds = new Set(
      [...teams.values()]
        .filter((team) => team.leadId === profile.id)
        .map((team) => team.id),
    )
  }

  const primaryTeamId = new Map<string, string>()
  for (const row of memberRows ?? []) {
    primaryTeamId.set(row.profile_id as string, row.team_id as string)
  }

  const skillName = new Map(
    (skillRows ?? []).map((row) => [row.id as string, row.name as string]),
  )
  const skillsByProfile = new Map<string, string[]>()
  for (const row of skillLinkRows ?? []) {
    const name = skillName.get(row.skill_id as string)
    if (!name) {
      continue
    }
    const list = skillsByProfile.get(row.profile_id as string) ?? []
    list.push(name)
    skillsByProfile.set(row.profile_id as string, list)
  }

  const presenceById = new Map(
    (presenceRows ?? []).map((row) => [row.profile_id as string, row]),
  )

  const nameById = new Map(
    (techRows ?? []).map((row) => [row.id as string, row.full_name as string]),
  )

  const woById = new Map<string, { id: string; number: string; title: string }>()
  for (const row of workOrderRows ?? []) {
    woById.set(row.id as string, {
      id: row.id as string,
      number: row.number as string,
      title: row.title as string,
    })
  }

  const now = Date.now()
  const technicians: BoardTechnician[] = []
  for (const person of techRows ?? []) {
    const id = person.id as string
    const teamId = primaryTeamId.get(id) ?? null
    if (leadTeamIds && (!teamId || !leadTeamIds.has(teamId))) {
      continue
    }
    const team = teamId ? teams.get(teamId) : undefined
    const presenceRow = presenceById.get(id)
    const rawStatus = presenceRow?.status as string | undefined
    let presence: PresenceStatus = "offline"
    if (rawStatus !== undefined && isPresenceStatus(rawStatus)) {
      presence = rawStatus
    }
    const lastSeenAt =
      (presenceRow?.last_seen_at as string | undefined) ??
      "1970-01-01T00:00:00.000Z"
    const currentId = (presenceRow?.current_work_order_id as string | null) ?? null
    technicians.push({
      id,
      fullName: person.full_name as string,
      teamId,
      teamName: team?.name ?? null,
      teamColor: team?.color ?? "teal",
      presence: displayPresence(presence, new Date(lastSeenAt)),
      lastSeenAt,
      currentWorkOrder: currentId ? (woById.get(currentId) ?? null) : null,
      skills: skillsByProfile.get(id) ?? [],
    })
  }

  technicians.sort((a, b) => a.fullName.localeCompare(b.fullName))

  const workOrders: BoardWorkOrder[] = []
  for (const row of workOrderRows ?? []) {
    const status = String(row.status)
    const priority = String(row.priority)
    if (!isWorkOrderStatus(status) || !isWorkOrderPriority(priority)) {
      continue
    }
    const teamId = (row.team_id as string | null) ?? null
    const assignee = (row.assigned_technician_id as string | null) ?? null
    if (leadTeamIds) {
      const assigneeTeam = assignee ? primaryTeamId.get(assignee) : undefined
      const inLead =
        (teamId !== null && leadTeamIds.has(teamId)) ||
        (assigneeTeam !== undefined && leadTeamIds.has(assigneeTeam))
      if (!inLead) {
        continue
      }
    }
    workOrders.push({
      id: row.id as string,
      number: row.number as string,
      title: row.title as string,
      status,
      priority,
      teamId,
      assignedTechnicianId: assignee,
      assignedName: assignee ? (nameById.get(assignee) ?? null) : null,
      siteAddress: row.site_address as string,
      requiredSkillName: row.required_skill_id
        ? (skillName.get(row.required_skill_id as string) ?? null)
        : null,
      dueAt:
        row.due_at === null || row.due_at === undefined
          ? null
          : String(row.due_at),
      overdue:
        row.due_at !== null &&
        row.due_at !== undefined &&
        !isTerminalStatus(status) &&
        new Date(String(row.due_at)).getTime() < now,
    })
  }

  return { technicians, workOrders }
}
