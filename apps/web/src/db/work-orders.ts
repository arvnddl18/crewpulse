import {
  isTerminalStatus,
  isWorkOrderPriority,
  isWorkOrderStatus,
  type OrderActionType,
  type WorkOrderPriority,
  type WorkOrderStatus,
  type WorkOrderType,
} from "@crewpulse/domain"
import type { SupabaseClient } from "@supabase/supabase-js"

export type WorkOrderListItem = {
  id: string
  number: string
  title: string
  status: WorkOrderStatus
  priority: WorkOrderPriority
  workOrderType: WorkOrderType | null
  orderActionType: OrderActionType | null
  siteAddress: string
  assignedTechnicianId: string | null
  teamId: string | null
  scheduledStart: string | null
  dueAt: string | null
  overdue: boolean
}

export type WorkOrderEvent = {
  id: string
  eventType: string
  fromStatus: string | null
  toStatus: string | null
  createdAt: string
  actorId: string | null
}

export type WorkOrderNote = {
  id: string
  body: string
  authorId: string
  createdAt: string
}

export type WorkOrderAttachment = {
  id: string
  mime: string | null
  createdAt: string
}

export type WorkOrderDetail = WorkOrderListItem & {
  description: string | null
  customerName: string | null
  customerPhone: string | null
  requiredSkillId: string | null
  createdAt: string
  events: WorkOrderEvent[]
  notes: WorkOrderNote[]
  attachments: WorkOrderAttachment[]
}

export async function listWorkOrders(
  supabase: SupabaseClient,
  orgId: string,
  filters: {
    status?: string
    team?: string
    priority?: string
    q?: string
    overdue?: boolean
  },
): Promise<WorkOrderListItem[]> {
  let query = supabase
    .from("work_orders")
    .select(
      "id, number, title, status, priority, work_order_type, order_action_type, site_address, assigned_technician_id, team_id, scheduled_start, due_at",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100)

  if (filters.status) {
    query = query.eq("status", filters.status)
  }
  if (filters.team) {
    query = query.eq("team_id", filters.team)
  }
  if (filters.priority) {
    query = query.eq("priority", filters.priority)
  }
  if (filters.q) {
    const term = `%${filters.q.trim()}%`
    query = query.or(
      `number.ilike.${term},title.ilike.${term},site_address.ilike.${term}`,
    )
  }
  if (filters.overdue) {
    query = query
      .not("due_at", "is", null)
      .lt("due_at", new Date().toISOString())
      .not(
        "status",
        "in",
        "(completed,cancelled,needs_followup)",
      )
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }
  return (data ?? []).flatMap((row) => {
    const item = mapListItem(row)
    return item ? [item] : []
  })
}

export async function getWorkOrderDetail(
  supabase: SupabaseClient,
  id: string,
): Promise<WorkOrderDetail | null> {
  const { data, error } = await supabase
    .from("work_orders")
    .select(
      "id, number, title, description, status, priority, work_order_type, order_action_type, site_address, assigned_technician_id, team_id, scheduled_start, due_at, customer_name, customer_phone, required_skill_id, created_at",
    )
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    return null
  }
  const base = mapListItem(data)
  if (!base) {
    return null
  }

  const { data: events } = await supabase
    .from("work_order_events")
    .select("id, event_type, from_status, to_status, created_at, actor_id")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true })

  const { data: notes } = await supabase
    .from("work_order_notes")
    .select("id, body, author_id, created_at")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true })

  const { data: attachments } = await supabase
    .from("attachments")
    .select("id, mime, created_at")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true })

  return {
    ...base,
    description: (data.description as string | null) ?? null,
    customerName: (data.customer_name as string | null) ?? null,
    customerPhone: (data.customer_phone as string | null) ?? null,
    requiredSkillId: (data.required_skill_id as string | null) ?? null,
    createdAt: data.created_at as string,
    events: (events ?? []).map((row) => ({
      id: row.id as string,
      eventType: row.event_type as string,
      fromStatus: (row.from_status as string | null) ?? null,
      toStatus: (row.to_status as string | null) ?? null,
      createdAt: row.created_at as string,
      actorId: (row.actor_id as string | null) ?? null,
    })),
    notes: (notes ?? []).map((row) => ({
      id: row.id as string,
      body: row.body as string,
      authorId: row.author_id as string,
      createdAt: row.created_at as string,
    })),
    attachments: (attachments ?? []).map((row) => ({
      id: row.id as string,
      mime: (row.mime as string | null) ?? null,
      createdAt: row.created_at as string,
    })),
  }
}

function mapListItem(row: Record<string, unknown>): WorkOrderListItem | null {
  const status = String(row.status)
  const priority = String(row.priority)
  if (!isWorkOrderStatus(status) || !isWorkOrderPriority(priority)) {
    return null
  }
  return {
    id: String(row.id),
    number: String(row.number),
    title: String(row.title),
    status,
    priority,
    workOrderType: row.work_order_type ? String(row.work_order_type) as WorkOrderType : null,
    orderActionType: row.order_action_type ? String(row.order_action_type) as OrderActionType : null,
    siteAddress: String(row.site_address),
    assignedTechnicianId:
      row.assigned_technician_id === null
        ? null
        : String(row.assigned_technician_id),
    teamId: row.team_id === null ? null : String(row.team_id),
    scheduledStart:
      row.scheduled_start === null || row.scheduled_start === undefined
        ? null
        : String(row.scheduled_start),
    dueAt:
      row.due_at === null || row.due_at === undefined
        ? null
        : String(row.due_at),
    overdue: isOverdueRow(row),
  }
}

function isOverdueRow(row: Record<string, unknown>): boolean {
  const dueAt = row.due_at
  const status = String(row.status)
  if (dueAt === null || dueAt === undefined) {
    return false
  }
  if (!isWorkOrderStatus(status) || isTerminalStatus(status)) {
    return false
  }
  const due = new Date(String(dueAt))
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now()
}
