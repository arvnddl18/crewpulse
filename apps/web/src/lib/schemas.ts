import { z } from "zod"
import { ORDER_ACTION_TYPES, WORK_ORDER_PRIORITIES, WORK_ORDER_STATUSES, WORK_ORDER_TYPES } from "@crewpulse/domain"

export const uuidSchema = z.string().uuid()

export const createWorkOrderSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).optional(),
    work_order_type: z.enum(WORK_ORDER_TYPES),
    order_action_type: z.enum(ORDER_ACTION_TYPES).optional().nullable(),
    priority: z.enum(WORK_ORDER_PRIORITIES),
    customer_name: z.string().trim().max(200).optional(),
    customer_phone: z.string().trim().max(40).optional(),
    site_address: z.string().trim().min(1).max(400),
    required_skill_id: uuidSchema.optional().nullable(),
    team_id: uuidSchema.optional().nullable(),
    scheduled_start: z.string().datetime().optional().nullable(),
    scheduled_end: z.string().datetime().optional().nullable(),
    due_at: z.string().datetime().optional().nullable(),
  })
  .strict()

export const assignWorkOrderSchema = z
  .object({
    technicianId: uuidSchema,
  })
  .strict()

export const transitionWorkOrderSchema = z
  .object({
    to: z.enum(WORK_ORDER_STATUSES),
    note: z.string().trim().max(2000).optional(),
  })
  .strict()

export const presenceSchema = z
  .object({
    status: z.enum(["available", "on_break", "offline"]),
  })
  .strict()

export const patchMeSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(40).optional().nullable(),
    theme: z.enum(["dark", "light"]).optional(),
    email_notifications: z.boolean().optional(),
    location_sharing_opt_in: z.boolean().optional(),
  })
  .strict()

export const patchWorkOrderSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(4000).optional().nullable(),
    work_order_type: z.enum(WORK_ORDER_TYPES).optional(),
    order_action_type: z.enum(ORDER_ACTION_TYPES).optional().nullable(),
    priority: z.enum(WORK_ORDER_PRIORITIES).optional(),
    customer_name: z.string().trim().max(200).optional().nullable(),
    customer_phone: z.string().trim().max(40).optional().nullable(),
    site_address: z.string().trim().min(1).max(400).optional(),
    required_skill_id: uuidSchema.optional().nullable(),
    team_id: uuidSchema.optional().nullable(),
    scheduled_start: z.string().datetime().optional().nullable(),
    scheduled_end: z.string().datetime().optional().nullable(),
    due_at: z.string().datetime().optional().nullable(),
  })
  .strict()

export const locationPingSchema = z
  .object({
    workOrderId: uuidSchema,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracyM: z.number().min(0).optional().nullable(),
  })
  .strict()

export const workOrderMessageSchema = z
  .object({
    body: z.string().trim().max(2000).optional(),
    attachmentId: uuidSchema.optional().nullable(),
  })
  .strict()
  .refine((v) => (v.body && v.body.length > 0) || v.attachmentId, {
    message: "body or attachmentId required",
  })

export const checklistItemCompleteSchema = z
  .object({
    itemId: uuidSchema,
    completed: z.boolean(),
    attachmentId: uuidSchema.optional().nullable(),
  })
  .strict()

export const putChecklistTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    isActive: z.boolean(),
    items: z.array(
      z.object({
        label: z.string().trim().min(1).max(200),
        sortOrder: z.number().int().min(0),
        isRequired: z.boolean(),
        requiresPhoto: z.boolean(),
      }),
    ),
  })
  .strict()

export const createShiftSchema = z
  .object({
    profile_id: uuidSchema,
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .strict()
  .refine((value) => new Date(value.ends_at) > new Date(value.starts_at), {
    message: "ends_at must be after starts_at",
  })

export const patchProfileAdminSchema = z
  .object({
    role: z.enum(["admin", "dispatcher", "team_lead", "technician"]).optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
