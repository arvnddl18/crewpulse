import type {
  OrderActionType,
  PresenceStatus,
  Role,
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderType,
} from "@crewpulse/domain"

export type MeProfile = {
  id: string
  orgId: string
  fullName: string
  email: string
  phone: string | null
  role: Role
  isActive: boolean
  theme: "dark" | "light"
  emailNotifications: boolean
  locationSharingOptIn: boolean
}

export type AuditLogRow = {
  id: string
  actorId: string | null
  actorName: string | null
  action: string
  entity: string
  entityId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

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

export type BoardPayload = {
  technicians: BoardTechnician[]
  work_orders: BoardWorkOrder[]
}

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

export type WorkOrderDetail = WorkOrderListItem & {
  description: string | null
  customerName: string | null
  customerPhone: string | null
  requiredSkillId: string | null
  createdAt: string
  events: Array<{
    id: string
    eventType: string
    fromStatus: string | null
    toStatus: string | null
    createdAt: string
    actorId: string | null
  }>
  notes: Array<{
    id: string
    body: string
    authorId: string
    createdAt: string
  }>
  attachments: Array<{
    id: string
    mime: string | null
    createdAt: string
  }>
}

export type AssignableTechnician = {
  id: string
  fullName: string
  teamId: string | null
  presence: string
  lastSeenAt: string | null
  skills: string[]
}

export type TeamOption = {
  id: string
  name: string
  color: string
  leadId: string | null
}

export type SkillOption = {
  id: string
  name: string
  category: string | null
}

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string | null
  workOrderId: string | null
  readAt: string | null
  createdAt: string
}

export type ReportUploadSummary = {
  id: string
  originalFilename: string
  asOfDate: string | null
  status: string
  rowCount: number | null
  error: string | null
  createdAt: string
}

export type SlotAdherenceAggregate = {
  uploadId: string
  originalFilename: string | null
  uploadedAt: string | null
  asOfDate: string | null
  totalRows: number
  adheredCount: number
  missedSlotCount: number
  openCount: number
  adherenceRate: number
  bySkillset: Array<{ skillset: string; total: number; adhered: number }>
  byTeam: Array<{ teamName: string; total: number; adhered: number }>
  agingMatrix: Array<{
    delayReason: string
    buckets: Record<string, number>
    total: number
  }>
}

export type SlotAdherenceRowItem = {
  id: string
  workOrderNumber: string
  slotRaw: string | null
  slotDate: string | null
  slotPeriod: string | null
  status: string | null
  skillset: string | null
  teamName: string | null
  slaBucket: string | null
  adhered: boolean
}

export type ChecklistTemplateView = {
  id: string
  skillId: string
  skillName: string
  name: string
  isActive: boolean
  items: Array<{
    id: string
    label: string
    sortOrder: number
    isRequired: boolean
    requiresPhoto: boolean
  }>
}

export type WorkOrderChecklistView = {
  templateName: string | null
  items: Array<{
    id: string
    label: string
    sortOrder: number
    isRequired: boolean
    requiresPhoto: boolean
    completed: boolean
    attachmentId: string | null
  }>
  complete: boolean
}

export type WorkOrderMessageView = {
  id: string
  authorId: string
  authorName: string
  body: string | null
  attachmentId: string | null
  createdAt: string
}

export type MapPayload = {
  technicians: Array<{
    profileId: string
    fullName: string
    teamColor: string
    workOrderId: string
    workOrderNumber: string
    lat: number
    lng: number
    recordedAt: string
    ageSeconds: number
  }>
  sites: Array<{
    workOrderId: string
    number: string
    title: string
    lat: number
    lng: number
    siteAddress: string
  }>
}

export type ShiftItem = {
  id: string
  profileId: string
  profileName: string
  startsAt: string
  endsAt: string
  notes: string | null
}
