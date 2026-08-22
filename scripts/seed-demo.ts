/**
 * CrewPulse demo seed — run on staging/local only.
 *
 *   npx tsx scripts/seed-demo.ts
 *
 * Requires SUPABASE_URL + SUPABASE_SECRET_KEY in .env.local (loaded via dotenv if present).
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

const ORG_ID = "00000000-0000-4000-8000-000000000001"
const DEMO_PASSWORD = "CrewPulseDemo1!"

type DemoUser = {
  email: string
  fullName: string
  role: "admin" | "dispatcher" | "team_lead" | "technician"
  id?: string
}

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, "utf8")
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const value = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "")
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile()

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY

if (!url || !secret) {
  console.error("Missing SUPABASE_URL and SUPABASE_SECRET_KEY")
  process.exit(1)
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const users: DemoUser[] = [
  { email: "admin@crewpulse.demo", fullName: "Alex Admin", role: "admin" },
  { email: "dispatch1@crewpulse.demo", fullName: "Dana Dispatcher", role: "dispatcher" },
  { email: "dispatch2@crewpulse.demo", fullName: "Sam Dispatcher", role: "dispatcher" },
  { email: "lead1@crewpulse.demo", fullName: "Leo Team Lead", role: "team_lead" },
  { email: "lead2@crewpulse.demo", fullName: "Ria Team Lead", role: "team_lead" },
  { email: "tech1@crewpulse.demo", fullName: "Ana Cruz", role: "technician" },
  { email: "tech2@crewpulse.demo", fullName: "Ben Santos", role: "technician" },
  { email: "tech3@crewpulse.demo", fullName: "Carlo Reyes", role: "technician" },
  { email: "tech4@crewpulse.demo", fullName: "Dina Park", role: "technician" },
  { email: "tech5@crewpulse.demo", fullName: "Eli Gomez", role: "technician" },
  { email: "tech6@crewpulse.demo", fullName: "Faith Lim", role: "technician" },
  { email: "tech7@crewpulse.demo", fullName: "Gabe Tan", role: "technician" },
  { email: "tech8@crewpulse.demo", fullName: "Hana Vega", role: "technician" },
]

async function ensureUser(user: DemoUser): Promise<string> {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 })
  const existing = listed.users.find((u) => u.email === user.email)
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      app_metadata: { org_id: ORG_ID, role: user.role },
      user_metadata: { full_name: user.fullName },
    })
    if (error) {
      throw new Error(`Update user ${user.email}: ${error.message}`)
    }
    return existing.id
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    app_metadata: { org_id: ORG_ID, role: user.role },
    user_metadata: { full_name: user.fullName },
  })
  if (error || !data.user) {
    throw new Error(`Create user ${user.email}: ${error?.message ?? "unknown"}`)
  }
  return data.user.id
}

async function main(): Promise<void> {
  console.log("Seeding CrewPulse demo…")

  for (const user of users) {
    user.id = await ensureUser(user)
    console.log(`  user ${user.email}`)
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    users.map((user) => ({
      id: user.id,
      org_id: ORG_ID,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
      is_active: true,
    })),
  )
  if (profileError) {
    throw new Error(`Upsert profiles: ${profileError.message}`)
  }

  const adminUser = users[0]
  const dispatch1 = users[1]
  const lead1 = users[3]
  const lead2 = users[4]
  const techs = users.filter((u) => u.role === "technician")

  const teamAlpha = "11111111-1111-4111-8111-111111111111"
  const teamBeta = "22222222-2222-4222-8222-222222222222"
  const skillFiberSplicing = "33333333-3333-4333-8333-333333333333"
  const skillCpeInstall = "44444444-4444-4444-8444-444444444444"
  const skillLineRepair = "55555555-5555-4555-8555-555555555551"
  const skillGpon = "55555555-5555-4555-8555-555555555552"
  const skillAerialCable = "55555555-5555-4555-8555-555555555553"
  const skillUndergroundCable = "55555555-5555-4555-8555-555555555554"

  await admin.from("teams").upsert([
    {
      id: teamAlpha,
      org_id: ORG_ID,
      name: "Davao North Alpha",
      color: "teal",
      lead_id: lead1.id,
    },
    {
      id: teamBeta,
      org_id: ORG_ID,
      name: "Davao North Beta",
      color: "amber",
      lead_id: lead2.id,
    },
  ])

  await admin.from("skills").upsert([
    { id: skillFiberSplicing, org_id: ORG_ID, name: "Fiber Splicing", category: "Network" },
    { id: skillCpeInstall, org_id: ORG_ID, name: "CPE Installation", category: "Customer Premise" },
    { id: skillLineRepair, org_id: ORG_ID, name: "Line Repair", category: "Maintenance" },
    { id: skillGpon, org_id: ORG_ID, name: "GPON Troubleshooting", category: "Network" },
    { id: skillAerialCable, org_id: ORG_ID, name: "Aerial Cable", category: "Infrastructure" },
    { id: skillUndergroundCable, org_id: ORG_ID, name: "Underground Cable", category: "Infrastructure" },
  ])

  // Remove legacy HVAC / Electrical skills if present from early seeds
  await admin
    .from("skills")
    .delete()
    .eq("org_id", ORG_ID)
    .in("name", ["HVAC", "Electrical"])

  const memberRows = [
    ...techs.slice(0, 4).map((t) => ({
      team_id: teamAlpha,
      profile_id: t.id!,
      is_primary: true,
    })),
    ...techs.slice(4).map((t) => ({
      team_id: teamBeta,
      profile_id: t.id!,
      is_primary: true,
    })),
  ]
  await admin.from("team_members").upsert(memberRows)

  const skillLinks = [
    { profile_id: techs[0]!.id!, skill_id: skillFiberSplicing },
    { profile_id: techs[0]!.id!, skill_id: skillCpeInstall },
    { profile_id: techs[1]!.id!, skill_id: skillFiberSplicing },
    { profile_id: techs[1]!.id!, skill_id: skillGpon },
    { profile_id: techs[2]!.id!, skill_id: skillAerialCable },
    { profile_id: techs[2]!.id!, skill_id: skillLineRepair },
    { profile_id: techs[3]!.id!, skill_id: skillCpeInstall },
    { profile_id: techs[3]!.id!, skill_id: skillGpon },
    { profile_id: techs[4]!.id!, skill_id: skillUndergroundCable },
    { profile_id: techs[4]!.id!, skill_id: skillFiberSplicing },
    { profile_id: techs[5]!.id!, skill_id: skillLineRepair },
    { profile_id: techs[5]!.id!, skill_id: skillCpeInstall },
    { profile_id: techs[6]!.id!, skill_id: skillAerialCable },
    { profile_id: techs[6]!.id!, skill_id: skillGpon },
    { profile_id: techs[7]!.id!, skill_id: skillFiberSplicing },
    { profile_id: techs[7]!.id!, skill_id: skillUndergroundCable },
  ]
  await admin.from("technician_skills").upsert(skillLinks)

  const statuses = [
    "available",
    "available",
    "en_route",
    "on_site",
    "on_break",
    "available",
    "offline",
    "available",
  ] as const

  for (let i = 0; i < techs.length; i++) {
    const tech = techs[i]!
    await admin.from("technician_presence").upsert({
      profile_id: tech.id,
      org_id: ORG_ID,
      status: statuses[i] ?? "available",
      last_seen_at: new Date().toISOString(),
    })
  }

  type WoSpec = {
    title: string
    status: string
    priority: string
    work_order_type: "Repair" | "Install" | "Migration"
    order_action_type: "PR" | "PV" | "CH" | null
    site_address: string
    skill: string
    team: string
    assignee?: string
    /** Appointment slot start (Asia/Manila). Maps to CRM/BSS appointmentdate. */
    scheduled_start?: string
    scheduled_end?: string
  }
  // work_order_type matches CRM/BSS skillset: Repair | Install | Migration
  // order_action_type matches CRM/BSS orderactiontype: PR (Provisioning) | PV (Pre-visit) | CH (Change) — null for Repair
  // scheduled_* maps to CRM/BSS appointmentdate AM/PM Slot windows (Asia/Manila)
  const amSlot = (day: string) => ({
    scheduled_start: `${day}T00:00:00+08:00`,
    scheduled_end: `${day}T12:59:00+08:00`,
  })
  const pmSlot = (day: string) => ({
    scheduled_start: `${day}T13:00:00+08:00`,
    scheduled_end: `${day}T23:59:00+08:00`,
  })

  const woSpecs: WoSpec[] = [
    {
      title: "No internet — fiber cut near Purok 7",
      status: "queued",
      priority: "critical",
      work_order_type: "Repair",
      order_action_type: null,
      site_address: "Purok 7, Bunawan, Davao City",
      skill: skillFiberSplicing,
      team: teamAlpha,
      ...amSlot("2026-08-20"),
    },
    {
      title: "New FTTH install — residential",
      status: "queued",
      priority: "high",
      work_order_type: "Install",
      order_action_type: "PR",
      site_address: "Panacan, Davao City",
      skill: skillCpeInstall,
      team: teamBeta,
      ...pmSlot("2026-08-20"),
    },
    {
      title: "ONT replacement — blinking red LOS",
      status: "assigned",
      priority: "medium",
      work_order_type: "Repair",
      order_action_type: null,
      site_address: "Sasa, Davao City",
      skill: skillCpeInstall,
      team: teamAlpha,
      assignee: techs[0]!.id,
      ...amSlot("2026-08-19"),
    },
    {
      title: "Slow speed complaint — 20Mbps plan",
      status: "accepted",
      priority: "medium",
      work_order_type: "Repair",
      order_action_type: null,
      site_address: "Buhangin, Davao City",
      skill: skillGpon,
      team: teamAlpha,
      assignee: techs[1]!.id,
      ...pmSlot("2026-08-19"),
    },
    {
      title: "Aerial cable sagging — road crossing",
      status: "en_route",
      priority: "high",
      work_order_type: "Repair",
      order_action_type: null,
      site_address: "Cabantian, Davao City",
      skill: skillAerialCable,
      team: teamBeta,
      assignee: techs[2]!.id,
      ...amSlot("2026-08-20"),
    },
    {
      title: "Underground fiber break — road construction",
      status: "on_site",
      priority: "high",
      work_order_type: "Repair",
      order_action_type: null,
      site_address: "Indangan, Davao City",
      skill: skillUndergroundCable,
      team: teamAlpha,
      assignee: techs[3]!.id,
      ...pmSlot("2026-08-20"),
    },
    {
      title: "GPON OLT port failure — affects 32 subs",
      status: "in_progress",
      priority: "critical",
      work_order_type: "Repair",
      order_action_type: null,
      site_address: "Communal, Davao City",
      skill: skillGpon,
      team: teamBeta,
      assignee: techs[4]!.id,
      ...amSlot("2026-08-18"),
    },
    {
      title: "CPE config — new business subscriber",
      status: "completed",
      priority: "medium",
      work_order_type: "Install",
      order_action_type: "CH",
      site_address: "Tigatto, Davao City",
      skill: skillCpeInstall,
      team: teamBeta,
      assignee: techs[5]!.id,
      ...pmSlot("2026-08-15"),
    },
    {
      title: "Fiber splice closure repair",
      status: "draft",
      priority: "low",
      work_order_type: "Repair",
      order_action_type: null,
      site_address: "Mandug, Davao City",
      skill: skillFiberSplicing,
      team: teamAlpha,
    },
    {
      title: "New FTTH install — pre-visit survey",
      status: "queued",
      priority: "medium",
      work_order_type: "Install",
      order_action_type: "PV",
      site_address: "Pampanga, Davao City",
      skill: skillCpeInstall,
      team: teamAlpha,
      ...amSlot("2026-08-21"),
    },
    {
      title: "Line noise — intermittent disconnect",
      status: "paused",
      priority: "medium",
      work_order_type: "Repair",
      order_action_type: null,
      site_address: "Langub, Davao City",
      skill: skillLineRepair,
      team: teamBeta,
      assignee: techs[6]!.id,
      ...pmSlot("2026-08-17"),
    },
    {
      title: "Cancelled — duplicate work order",
      status: "cancelled",
      priority: "low",
      work_order_type: "Repair",
      order_action_type: null,
      site_address: "Callawa, Davao City",
      skill: skillLineRepair,
      team: teamAlpha,
    },
  ]

  const siteCoords: Record<string, { lat: number; lng: number }> = {
    "Purok 7, Bunawan, Davao City": { lat: 7.1142, lng: 125.6356 },
    "Panacan, Davao City": { lat: 7.1264, lng: 125.6428 },
    "Sasa, Davao City": { lat: 7.1089, lng: 125.6467 },
    "Buhangin, Davao City": { lat: 7.0968, lng: 125.6211 },
    "Cabantian, Davao City": { lat: 7.1156, lng: 125.6089 },
    "Indangan, Davao City": { lat: 7.1234, lng: 125.5978 },
    "Communal, Davao City": { lat: 7.1078, lng: 125.5856 },
    "Tigatto, Davao City": { lat: 7.1312, lng: 125.6145 },
    "Mandug, Davao City": { lat: 7.1389, lng: 125.6034 },
    "Pampanga, Davao City": { lat: 7.1201, lng: 125.6267 },
    "Langub, Davao City": { lat: 7.0945, lng: 125.6123 },
    "Callawa, Davao City": { lat: 7.1056, lng: 125.6189 },
  }

  const tplFiber = "55555555-5555-4555-8555-555555555555"
  const tplAerial = "66666666-6666-4666-8666-666666666666"

  await admin.from("checklist_templates").upsert([
    { id: tplFiber, org_id: ORG_ID, skill_id: skillFiberSplicing, name: "Fiber work safety", is_active: true },
    {
      id: tplAerial,
      org_id: ORG_ID,
      skill_id: skillAerialCable,
      name: "Aerial work safety",
      is_active: true,
    },
  ])

  await admin.from("checklist_items").delete().in("template_id", [tplFiber, tplAerial])
  await admin.from("checklist_items").insert([
    { template_id: tplFiber, org_id: ORG_ID, label: "Hard hat and safety vest", sort_order: 0, is_required: true, requires_photo: false },
    { template_id: tplFiber, org_id: ORG_ID, label: "Lockout/tagout verified", sort_order: 1, is_required: true, requires_photo: false },
    { template_id: tplFiber, org_id: ORG_ID, label: "Fiber optic safety glasses", sort_order: 2, is_required: true, requires_photo: true },
    { template_id: tplAerial, org_id: ORG_ID, label: "Fall protection harness", sort_order: 0, is_required: true, requires_photo: false },
    { template_id: tplAerial, org_id: ORG_ID, label: "Ladder inspection completed", sort_order: 1, is_required: true, requires_photo: false },
    { template_id: tplAerial, org_id: ORG_ID, label: "Area secured below", sort_order: 2, is_required: true, requires_photo: true },
  ])

  // Reset demo work orders so re-seed stays idempotent and broadband-aligned
  await admin.from("work_order_checklist_responses").delete().eq("org_id", ORG_ID)
  await admin.from("work_order_notes").delete().eq("org_id", ORG_ID)
  await admin.from("work_order_events").delete().eq("org_id", ORG_ID)
  await admin.from("attachments").delete().eq("org_id", ORG_ID)
  await admin.from("notifications").delete().eq("org_id", ORG_ID)
  await admin.from("technician_presence").update({ current_work_order_id: null }).eq("org_id", ORG_ID)
  await admin.from("work_orders").delete().eq("org_id", ORG_ID)

  for (const spec of woSpecs) {
    const coords = siteCoords[spec.site_address] ?? null
    const { data: wo, error } = await admin
      .from("work_orders")
      .insert({
        org_id: ORG_ID,
        title: spec.title,
        status: spec.status,
        priority: spec.priority,
        work_order_type: spec.work_order_type,
        order_action_type: spec.order_action_type ?? null,
        site_address: spec.site_address,
        site_lat: coords?.lat ?? null,
        site_lng: coords?.lng ?? null,
        required_skill_id: spec.skill,
        team_id: spec.team,
        assigned_technician_id: spec.assignee ?? null,
        scheduled_start: spec.scheduled_start ?? null,
        scheduled_end: spec.scheduled_end ?? null,
        due_at: spec.scheduled_end ?? null,
        created_by: dispatch1.id!,
      })
      .select("id, status, assigned_technician_id")
      .single()
    if (error) {
      console.warn(`  skip WO ${spec.title}: ${error.message}`)
      continue
    }
    if (wo.assigned_technician_id && ["en_route", "on_site", "in_progress", "paused"].includes(wo.status as string)) {
      await admin
        .from("technician_presence")
        .update({
          current_work_order_id: wo.id,
          status:
            wo.status === "en_route"
              ? "en_route"
              : wo.status === "paused"
                ? "on_break"
              : wo.status === "on_site" || wo.status === "in_progress"
                ? "on_site"
                : "available",
          last_seen_at: new Date().toISOString(),
        })
        .eq("profile_id", wo.assigned_technician_id)
    }
  }

  console.log("\nDemo ready.")
  console.log(`Password for all demo users: ${DEMO_PASSWORD}`)
  console.log("Dispatcher: dispatch1@crewpulse.demo")
  console.log("Technician: tech3@crewpulse.demo (assigned en_route job)")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
