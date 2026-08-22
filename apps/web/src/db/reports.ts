import type { SupabaseClient } from "@supabase/supabase-js"
import type { ParsedCrmReportRow } from "@/services/parse-crm-report"

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

const INSERT_BATCH = 400
const SLA_BUCKETS = [
  "0-2 Days",
  "2-4 Days",
  "4-7 Days",
  "7-15 Days",
  "16-30 Days",
  "Above 30 Days",
] as const

export async function replaceOrgReport(
  supabase: SupabaseClient,
  input: {
    orgId: string
    uploadedBy: string
    originalFilename: string
    asOfDate: string | null
    rows: ParsedCrmReportRow[]
  },
): Promise<{ upload: ReportUploadSummary; rowCount: number }> {
  const { error: deleteError } = await supabase
    .from("report_uploads")
    .delete()
    .eq("org_id", input.orgId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  const { data, error } = await supabase
    .from("report_uploads")
    .insert({
      org_id: input.orgId,
      uploaded_by: input.uploadedBy,
      original_filename: input.originalFilename,
      as_of_date: input.asOfDate,
      status: "parsing",
    })
    .select(
      "id, original_filename, as_of_date, status, row_count, error, created_at",
    )
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create upload record")
  }

  const uploadId = data.id as string
  try {
    const rowCount = await saveParsedRows(
      supabase,
      input.orgId,
      uploadId,
      input.rows,
    )
    const upload = await getReportUpload(supabase, uploadId)
    if (!upload) {
      throw new Error("Upload record missing after save")
    }
    return { upload, rowCount }
  } catch (saveError) {
    await markUploadFailed(
      supabase,
      uploadId,
      saveError instanceof Error ? saveError.message : "Save failed",
    )
    throw saveError
  }
}

export async function insertReportUpload(
  supabase: SupabaseClient,
  input: {
    orgId: string
    uploadedBy: string
    originalFilename: string
    asOfDate: string | null
  },
): Promise<ReportUploadSummary> {
  const { data, error } = await supabase
    .from("report_uploads")
    .insert({
      org_id: input.orgId,
      uploaded_by: input.uploadedBy,
      original_filename: input.originalFilename,
      as_of_date: input.asOfDate,
      status: "parsing",
    })
    .select(
      "id, original_filename, as_of_date, status, row_count, error, created_at",
    )
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create upload record")
  }

  return mapUpload(data)
}

export async function markUploadFailed(
  supabase: SupabaseClient,
  uploadId: string,
  message: string,
): Promise<void> {
  await supabase
    .from("report_uploads")
    .update({ status: "failed", error: message })
    .eq("id", uploadId)
}

export async function saveParsedRows(
  supabase: SupabaseClient,
  orgId: string,
  uploadId: string,
  rows: ParsedCrmReportRow[],
): Promise<number> {
  await supabase.from("slot_adherence_rows").delete().eq("upload_id", uploadId)

  for (let offset = 0; offset < rows.length; offset += INSERT_BATCH) {
    const chunk = rows.slice(offset, offset + INSERT_BATCH)
    const { error } = await supabase.from("slot_adherence_rows").insert(
      chunk.map((row) => ({
        org_id: orgId,
        upload_id: uploadId,
        work_order_number: row.workOrderNumber,
        slot_raw: row.slotRaw,
        slot_date: row.slotDate,
        slot_period: row.slotPeriod,
        status: row.status,
        substatus: row.substatus,
        skillset: row.skillset,
        queue: row.queue,
        team_name: row.teamName,
        contractor_name: row.contractorName,
        delay_reason: row.delayReason,
        sla_bucket: row.slaBucket,
        created_at_src: row.createdAtSrc,
        completed_at_src: row.completedAtSrc,
        adhered: row.adhered,
      })),
    )
    if (error) {
      throw new Error(error.message)
    }
  }

  const { error: uploadError } = await supabase
    .from("report_uploads")
    .update({ status: "ready", row_count: rows.length, error: null })
    .eq("id", uploadId)

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  return rows.length
}

export async function getReportUpload(
  supabase: SupabaseClient,
  uploadId: string,
): Promise<ReportUploadSummary | null> {
  const { data, error } = await supabase
    .from("report_uploads")
    .select(
      "id, original_filename, as_of_date, status, row_count, error, created_at",
    )
    .eq("id", uploadId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data ? mapUpload(data) : null
}

export async function getLatestReadyUploadId(
  supabase: SupabaseClient,
  orgId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("report_uploads")
    .select("id")
    .eq("org_id", orgId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return (data?.id as string | undefined) ?? null
}

export async function loadSlotAdherenceAggregate(
  supabase: SupabaseClient,
  uploadId: string,
): Promise<SlotAdherenceAggregate | null> {
  const upload = await getReportUpload(supabase, uploadId)
  if (!upload) {
    return null
  }

  const { data: rows, error } = await supabase
    .from("slot_adherence_rows")
    .select("status, adhered, skillset, team_name, delay_reason, sla_bucket")
    .eq("upload_id", uploadId)

  if (error) {
    throw new Error(error.message)
  }

  const facts = rows ?? []
  const totalRows = facts.length
  const adheredCount = facts.filter((row) => row.adhered === true).length
  const missedSlotCount = facts.filter(
    (row) => String(row.status) === "Completed" && row.adhered !== true,
  ).length
  const openCount = facts.filter((row) => String(row.status) !== "Completed").length

  return {
    uploadId,
    originalFilename: upload.originalFilename,
    uploadedAt: upload.createdAt,
    asOfDate: upload.asOfDate,
    totalRows,
    adheredCount,
    missedSlotCount,
    openCount,
    adherenceRate: totalRows === 0 ? 0 : adheredCount / totalRows,
    bySkillset: aggregateBy(
      facts,
      (row) => String(row.skillset ?? "Unknown"),
      (name, stats) => ({ skillset: name, ...stats }),
    ),
    byTeam: aggregateBy(
      facts,
      (row) => String(row.team_name ?? "Unmapped"),
      (name, stats) => ({ teamName: name, ...stats }),
    ),
    agingMatrix: buildAgingMatrix(facts),
  }
}

export async function listSlotAdherenceRows(
  supabase: SupabaseClient,
  uploadId: string,
  filters: {
    skillset?: string
    team?: string
    adhered?: string
    limit?: number
  },
): Promise<SlotAdherenceRowItem[]> {
  let query = supabase
    .from("slot_adherence_rows")
    .select(
      "id, work_order_number, slot_raw, slot_date, slot_period, status, skillset, team_name, sla_bucket, adhered",
    )
    .eq("upload_id", uploadId)
    .order("work_order_number", { ascending: true })
    .limit(filters.limit ?? 200)

  if (filters.skillset) {
    query = query.eq("skillset", filters.skillset)
  }
  if (filters.team) {
    query = query.eq("team_name", filters.team)
  }
  if (filters.adhered === "true") {
    query = query.eq("adhered", true)
  }
  if (filters.adhered === "false") {
    query = query.eq("adhered", false)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    workOrderNumber: row.work_order_number as string,
    slotRaw: (row.slot_raw as string | null) ?? null,
    slotDate: (row.slot_date as string | null) ?? null,
    slotPeriod: (row.slot_period as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    skillset: (row.skillset as string | null) ?? null,
    teamName: (row.team_name as string | null) ?? null,
    slaBucket: (row.sla_bucket as string | null) ?? null,
    adhered: row.adhered === true,
  }))
}

function mapUpload(row: Record<string, unknown>): ReportUploadSummary {
  return {
    id: row.id as string,
    originalFilename: row.original_filename as string,
    asOfDate: (row.as_of_date as string | null) ?? null,
    status: row.status as string,
    rowCount: (row.row_count as number | null) ?? null,
    error: (row.error as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

function aggregateBy<T>(
  rows: Array<Record<string, unknown>>,
  keyFn: (row: Record<string, unknown>) => string,
  mapFn: (name: string, stats: { total: number; adhered: number }) => T,
): T[] {
  const map = new Map<string, { total: number; adhered: number }>()
  for (const row of rows) {
    const key = keyFn(row)
    const current = map.get(key) ?? { total: 0, adhered: 0 }
    current.total += 1
    if (row.adhered === true) {
      current.adhered += 1
    }
    map.set(key, current)
  }
  return [...map.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20)
    .map(([name, stats]) => mapFn(name, stats))
}

function buildAgingMatrix(
  rows: Array<Record<string, unknown>>,
): SlotAdherenceAggregate["agingMatrix"] {
  const map = new Map<string, Record<string, number>>()
  for (const row of rows) {
    const reason = String(row.delay_reason ?? "Unknown")
    const bucket = String(row.sla_bucket ?? "Unknown")
    const current =
      map.get(reason) ??
      Object.fromEntries(SLA_BUCKETS.map((label) => [label, 0]))
    if ((SLA_BUCKETS as readonly string[]).includes(bucket)) {
      current[bucket] = (current[bucket] ?? 0) + 1
    }
    map.set(reason, current)
  }
  return [...map.entries()]
    .map(([delayReason, buckets]) => ({
      delayReason,
      buckets,
      total: Object.values(buckets).reduce((sum, n) => sum + n, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15)
}
