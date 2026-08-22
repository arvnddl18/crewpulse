import type { SupabaseClient } from "@supabase/supabase-js"
import type { ChecklistItemView } from "@crewpulse/domain"

export type ChecklistTemplate = {
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

export async function listChecklistTemplates(
  supabase: SupabaseClient,
  orgId: string,
): Promise<ChecklistTemplate[]> {
  const { data: templates, error } = await supabase
    .from("checklist_templates")
    .select("id, skill_id, name, is_active, skills(name)")
    .eq("org_id", orgId)
    .order("name")

  if (error) {
    throw new Error(error.message)
  }

  const ids = (templates ?? []).map((t) => t.id as string)
  if (ids.length === 0) {
    return []
  }

  const { data: items, error: itemsError } = await supabase
    .from("checklist_items")
    .select("id, template_id, label, sort_order, is_required, requires_photo")
    .in("template_id", ids)
    .order("sort_order")

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  const byTemplate = new Map<string, ChecklistTemplate["items"]>()
  for (const row of items ?? []) {
    const tid = row.template_id as string
    const list = byTemplate.get(tid) ?? []
    list.push({
      id: row.id as string,
      label: row.label as string,
      sortOrder: row.sort_order as number,
      isRequired: row.is_required as boolean,
      requiresPhoto: row.requires_photo as boolean,
    })
    byTemplate.set(tid, list)
  }

  return (templates ?? []).map((t) => {
    const skill = t.skills as { name: string } | { name: string }[] | null
    const skillName = Array.isArray(skill) ? skill[0]?.name : skill?.name
    return {
      id: t.id as string,
      skillId: t.skill_id as string,
      skillName: skillName ?? "Unknown",
      name: t.name as string,
      isActive: t.is_active as boolean,
      items: byTemplate.get(t.id as string) ?? [],
    }
  })
}

export async function getWorkOrderChecklist(
  supabase: SupabaseClient,
  workOrderId: string,
  requiredSkillId: string | null,
): Promise<{ items: ChecklistItemView[]; templateName: string | null }> {
  if (!requiredSkillId) {
    return { items: [], templateName: null }
  }

  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id, name")
    .eq("skill_id", requiredSkillId)
    .eq("is_active", true)
    .maybeSingle()

  if (!template) {
    return { items: [], templateName: null }
  }

  const { data: templateItems, error } = await supabase
    .from("checklist_items")
    .select("id, label, sort_order, is_required, requires_photo")
    .eq("template_id", template.id)
    .order("sort_order")

  if (error) {
    throw new Error(error.message)
  }

  const { data: responses } = await supabase
    .from("work_order_checklist_responses")
    .select("item_id, completed, attachment_id")
    .eq("work_order_id", workOrderId)

  const responseMap = new Map(
    (responses ?? []).map((r) => [
      r.item_id as string,
      {
        completed: r.completed as boolean,
        attachmentId: (r.attachment_id as string | null) ?? null,
      },
    ]),
  )

  const items: ChecklistItemView[] = (templateItems ?? []).map((row) => {
    const resp = responseMap.get(row.id as string)
    return {
      id: row.id as string,
      label: row.label as string,
      sortOrder: row.sort_order as number,
      isRequired: row.is_required as boolean,
      requiresPhoto: row.requires_photo as boolean,
      completed: resp?.completed ?? false,
      attachmentId: resp?.attachmentId ?? null,
    }
  })

  return { items, templateName: template.name as string }
}

export async function upsertChecklistTemplate(
  supabase: SupabaseClient,
  orgId: string,
  templateId: string,
  payload: {
    name: string
    isActive: boolean
    items: Array<{
      label: string
      sortOrder: number
      isRequired: boolean
      requiresPhoto: boolean
    }>
  },
): Promise<void> {
  const { error: tplError } = await supabase
    .from("checklist_templates")
    .update({ name: payload.name, is_active: payload.isActive })
    .eq("id", templateId)
    .eq("org_id", orgId)

  if (tplError) {
    throw new Error(tplError.message)
  }

  await supabase.from("checklist_items").delete().eq("template_id", templateId)

  if (payload.items.length === 0) {
    return
  }

  const { error: insertError } = await supabase.from("checklist_items").insert(
    payload.items.map((item) => ({
      template_id: templateId,
      org_id: orgId,
      label: item.label,
      sort_order: item.sortOrder,
      is_required: item.isRequired,
      requires_photo: item.requiresPhoto,
    })),
  )

  if (insertError) {
    throw new Error(insertError.message)
  }
}
