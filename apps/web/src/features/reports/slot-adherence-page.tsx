"use client"

import { SLA_BUCKETS } from "@crewpulse/domain"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Upload } from "lucide-react"
import { Suspense, useRef, useState } from "react"
import { toast } from "sonner"
import { apiFetch, apiUploadForm, ApiError } from "@/lib/api-client"
import type {
  ReportUploadSummary,
  SlotAdherenceAggregate,
  SlotAdherenceRowItem,
} from "@/lib/types"
import { Button } from "@/shared/ui/button"
import { EmptyState, ErrorState, Skeleton } from "@/shared/ui/feedback"
import { cn } from "@/lib/cn"

type UploadResponse = {
  upload: ReportUploadSummary | null
  rowCount: number
  sheetName: string
}

function SlotAdherenceInner() {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null)
  const [rowFilter, setRowFilter] = useState<{
    skillset: string
    adhered: string
  }>({ skillset: "", adhered: "" })

  const aggregateQuery = useQuery({
    queryKey: ["slot-adherence", selectedUploadId],
    queryFn: () => {
      const qs = selectedUploadId ? `?uploadId=${selectedUploadId}` : ""
      return apiFetch<SlotAdherenceAggregate | null>(
        `/api/v1/reports/slot-adherence${qs}`,
      )
    },
  })

  const effectiveUploadId =
    selectedUploadId ?? aggregateQuery.data?.uploadId ?? null

  const rowsQuery = useQuery({
    queryKey: ["slot-adherence-rows", effectiveUploadId, rowFilter],
    queryFn: () => {
      if (!effectiveUploadId) return Promise.resolve([] as SlotAdherenceRowItem[])
      const params = new URLSearchParams({ uploadId: effectiveUploadId })
      if (rowFilter.skillset) params.set("skillset", rowFilter.skillset)
      if (rowFilter.adhered) params.set("adhered", rowFilter.adhered)
      return apiFetch<SlotAdherenceRowItem[]>(
        `/api/v1/reports/slot-adherence/rows?${params.toString()}`,
      )
    },
    enabled: effectiveUploadId !== null && aggregateQuery.data !== null,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.set("file", file)
      return apiUploadForm<UploadResponse>("/api/v1/reports/uploads", form)
    },
    onSuccess: (data) => {
      const id = data.upload?.id
      if (id) {
        setSelectedUploadId(id)
        toast.success(`Replaced report with ${data.rowCount} rows from ${data.sheetName}`)
        void queryClient.invalidateQueries({ queryKey: ["slot-adherence"] })
        void queryClient.invalidateQueries({ queryKey: ["slot-adherence-rows"] })
      }
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : "Upload failed"),
  })

  const agg = aggregateQuery.data

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
    }
    e.target.value = ""
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-[6px] border border-border bg-surface p-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
          {agg ? "Replace report" : "Upload CRM/BSS report"}
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Excel all-status export (Sheet2). The file is parsed in memory only — it is
          not saved. Upload a newer export to replace the current report.
        </p>
        {agg?.originalFilename ? (
          <p className="mt-2 font-mono text-xs text-text-muted">
            Current: {agg.originalFilename}
            {agg.uploadedAt
              ? ` · uploaded ${new Date(agg.uploadedAt).toLocaleString()}`
              : ""}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={onFileChange}
          />
          <Button
            variant="primary"
            disabled={uploadMutation.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" aria-hidden />
            {uploadMutation.isPending ? "Parsing…" : agg ? "Upload new file" : "Choose Excel file"}
          </Button>
          {uploadMutation.isPending ? (
            <span className="text-sm text-text-muted">This may take up to a minute.</span>
          ) : null}
        </div>
      </section>

      {aggregateQuery.isLoading ? (
        <Skeleton className="h-40" />
      ) : aggregateQuery.isError ? (
        <ErrorState
          message="Could not load slot adherence report."
          onRetry={() => void aggregateQuery.refetch()}
        />
      ) : !agg ? (
        <EmptyState message="Upload an all-status Excel file to see slot adherence." />
      ) : (
        <>
          <SummaryCards agg={agg} />
          <BreakdownSection title="By skillset" rows={agg.bySkillset} keyField="skillset" />
          <BreakdownSection title="By team" rows={agg.byTeam} keyField="teamName" />
          <AgingSection matrix={agg.agingMatrix} />
          <DrillDownSection
            agg={agg}
            rows={rowsQuery.data ?? []}
            loading={rowsQuery.isLoading}
            filter={rowFilter}
            onFilterChange={setRowFilter}
            skillsets={agg.bySkillset.map((s) => s.skillset)}
          />
        </>
      )}
    </div>
  )
}

export function SlotAdherenceShell() {
  return (
    <Suspense fallback={<Skeleton className="h-48" />}>
      <SlotAdherenceInner />
    </Suspense>
  )
}

function SummaryCards({ agg }: { agg: SlotAdherenceAggregate }) {
  const ratePct = Math.round(agg.adherenceRate * 1000) / 10
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="As of" value={agg.asOfDate ?? "—"} />
      <StatCard label="Total rows" value={String(agg.totalRows)} />
      <StatCard label="In slot" value={String(agg.adheredCount)} accent="success" />
      <StatCard label="Missed slot" value={String(agg.missedSlotCount)} accent="danger" />
      <StatCard label="Adherence" value={`${ratePct}%`} accent="primary" />
    </section>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: "primary" | "success" | "danger"
}) {
  return (
    <div className="rounded-[6px] border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-[0.04em] text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-xl font-semibold tabular-nums",
          accent === "primary" && "text-primary",
          accent === "success" && "text-[var(--green-done)]",
          accent === "danger" && "text-[var(--red-alert)]",
          !accent && "text-text",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function BreakdownSection({
  title,
  rows,
  keyField,
}: {
  title: string
  rows: Array<{ skillset?: string; teamName?: string; total: number; adhered: number }>
  keyField: "skillset" | "teamName"
}) {
  if (rows.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
        {title}
      </h2>
      <div className="overflow-x-auto rounded-[6px] border border-border">
        <table className="w-full min-w-[400px] text-sm">
          <thead className="border-b border-border bg-bg-muted text-left">
            <tr>
              <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                Name
              </th>
              <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                Total
              </th>
              <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                In slot
              </th>
              <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const name = row[keyField] ?? "Unknown"
              const rate = row.total === 0 ? 0 : Math.round((row.adhered / row.total) * 100)
              return (
                <tr key={name} className="border-b border-border">
                  <td className="px-3 py-2">{name}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{row.total}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{row.adhered}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{rate}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AgingSection({
  matrix,
}: {
  matrix: SlotAdherenceAggregate["agingMatrix"]
}) {
  if (matrix.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
        Aging heatmap (delay reason × SLA bucket)
      </h2>
      <div className="overflow-x-auto rounded-[6px] border border-border">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="border-b border-border bg-bg-muted text-left">
            <tr>
              <th className="px-2 py-2 font-medium uppercase tracking-[0.04em] text-text-muted">
                Delay reason
              </th>
              {SLA_BUCKETS.map((b) => (
                <th
                  key={b}
                  className="px-2 py-2 font-medium uppercase tracking-[0.04em] text-text-muted"
                >
                  {b}
                </th>
              ))}
              <th className="px-2 py-2 font-medium uppercase tracking-[0.04em] text-text-muted">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.delayReason} className="border-b border-border">
                <td className="max-w-[180px] truncate px-2 py-2">{row.delayReason}</td>
                {SLA_BUCKETS.map((b) => (
                  <td key={b} className="px-2 py-2 font-mono tabular-nums text-text-muted">
                    {row.buckets[b] ?? 0}
                  </td>
                ))}
                <td className="px-2 py-2 font-mono tabular-nums font-medium">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DrillDownSection({
  agg,
  rows,
  loading,
  filter,
  onFilterChange,
  skillsets,
}: {
  agg: SlotAdherenceAggregate
  rows: SlotAdherenceRowItem[]
  loading: boolean
  filter: { skillset: string; adhered: string }
  onFilterChange: (f: { skillset: string; adhered: string }) => void
  skillsets: string[]
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
        Drill-down ({agg.openCount} open · no PII)
      </h2>
      <div className="mb-3 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.04em] text-text-muted">
          Skillset
          <select
            className="h-8 rounded-[4px] border border-border bg-bg px-2 text-sm normal-case tracking-normal text-text"
            value={filter.skillset}
            onChange={(e) =>
              onFilterChange({ ...filter, skillset: e.target.value })
            }
          >
            <option value="">All</option>
            {skillsets.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.04em] text-text-muted">
          Adhered
          <select
            className="h-8 rounded-[4px] border border-border bg-bg px-2 text-sm normal-case tracking-normal text-text"
            value={filter.adhered}
            onChange={(e) =>
              onFilterChange({ ...filter, adhered: e.target.value })
            }
          >
            <option value="">All</option>
            <option value="true">In slot</option>
            <option value="false">Missed / open</option>
          </select>
        </label>
      </div>
      {loading ? (
        <Skeleton className="h-32" />
      ) : rows.length === 0 ? (
        <EmptyState message="No rows match these filters." />
      ) : (
        <div className="overflow-x-auto rounded-[6px] border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-bg-muted text-left">
              <tr>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  WO #
                </th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  Slot
                </th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  Status
                </th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  Skillset
                </th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  SLA
                </th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  Adhered
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border">
                  <td className="px-3 py-2 font-mono text-xs">{row.workOrderNumber}</td>
                  <td className="px-3 py-2 text-text-muted">{row.slotRaw ?? "—"}</td>
                  <td className="px-3 py-2">{row.status ?? "—"}</td>
                  <td className="px-3 py-2">{row.skillset ?? "—"}</td>
                  <td className="px-3 py-2 text-text-muted">{row.slaBucket ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        row.adhered ? "text-[var(--green-done)]" : "text-[var(--red-alert)]",
                      )}
                    >
                      {row.adhered ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
