"use client"

import {
  ORDER_ACTION_TYPES,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_TYPES,
  orderActionTypeLabel,
  type WorkOrderType,
} from "@crewpulse/domain"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { SkillOption, TeamOption } from "@/lib/types"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"

/** Convert datetime-local value (Asia/Manila wall time) to ISO UTC for the API. */
function localInputToIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const selectClass =
  "h-9 rounded-[4px] border border-border bg-bg px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"

export function CreateWorkOrderForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [workOrderType, setWorkOrderType] = useState<WorkOrderType>("Repair")
  const [orderActionType, setOrderActionType] = useState("")
  const [siteAddress, setSiteAddress] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [priority, setPriority] = useState<(typeof WORK_ORDER_PRIORITIES)[number]>("medium")
  const [scheduledStart, setScheduledStart] = useState("")
  const [scheduledEnd, setScheduledEnd] = useState("")
  const [teamId, setTeamId] = useState("")
  const [skillId, setSkillId] = useState("")

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiFetch<TeamOption[]>("/api/v1/teams"),
  })
  const skillsQuery = useQuery({
    queryKey: ["skills"],
    queryFn: () => apiFetch<SkillOption[]>("/api/v1/skills"),
  })

  const isInstall = workOrderType === "Install"

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setPending(true)
    try {
      const created = await apiFetch<{ id: string; number: string }>(
        "/api/v1/work-orders",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            description: description || undefined,
            work_order_type: workOrderType,
            order_action_type: isInstall && orderActionType ? orderActionType : null,
            site_address: siteAddress,
            customer_name: customerName || undefined,
            customer_phone: customerPhone || undefined,
            priority,
            scheduled_start: localInputToIso(scheduledStart),
            scheduled_end: localInputToIso(scheduledEnd),
            team_id: teamId || null,
            required_skill_id: skillId || null,
          }),
        },
      )
      toast.success(`Created ${created.number}`)
      router.push(`/work-orders/${created.id}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Create failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="mx-auto flex max-w-2xl flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Description</span>
        <textarea
          className="min-h-[96px] rounded-[4px] border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <Input
        label="Site address"
        value={siteAddress}
        onChange={(e) => setSiteAddress(e.target.value)}
        required
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Customer name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <Input
          label="Customer phone"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Skillset</span>
          <select
            className={selectClass}
            value={workOrderType}
            onChange={(e) => {
              const next = e.target.value as WorkOrderType
              setWorkOrderType(next)
              if (next !== "Install") setOrderActionType("")
            }}
            required
          >
            {WORK_ORDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="text-xs text-text-muted">
            Matches CRM/BSS skillset: Repair, Install, Migration
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Order action type</span>
          <select
            className={selectClass}
            value={orderActionType}
            onChange={(e) => setOrderActionType(e.target.value)}
            disabled={!isInstall}
          >
            <option value="">{isInstall ? "Select…" : "N/A (Repair / Migration)"}</option>
            {ORDER_ACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t} — {orderActionTypeLabel(t)}
              </option>
            ))}
          </select>
          <span className="text-xs text-text-muted">
            Install only: PR / PV / CH
          </span>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Priority</span>
        <select
          className={selectClass}
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as (typeof WORK_ORDER_PRIORITIES)[number])
          }
        >
          {WORK_ORDER_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Appointment start (slot)</span>
          <input
            type="datetime-local"
            className={selectClass}
            value={scheduledStart}
            onChange={(e) => setScheduledStart(e.target.value)}
          />
          <span className="text-xs text-text-muted">
            CRM/BSS appointmentdate — e.g. AM Slot / PM Slot window
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Appointment end</span>
          <input
            type="datetime-local"
            className={selectClass}
            value={scheduledEnd}
            onChange={(e) => setScheduledEnd(e.target.value)}
          />
          <span className="text-xs text-text-muted">
            Sets due time for overdue tracking
          </span>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Team (optional)</span>
        <select
          className={selectClass}
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">None</option>
          {(teamsQuery.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Required tech skill (optional)</span>
        <select
          className={selectClass}
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
        >
          <option value="">None</option>
          {(skillsQuery.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-text-muted">
          Technician capability (Fiber Splicing, CPE Installation, …) — used for assignment matching
        </span>
      </label>
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
          Create work order
        </Button>
        <Link href="/work-orders">
          <Button type="button">Cancel</Button>
        </Link>
      </div>
    </form>
  )
}
