"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Suspense, useMemo, useState } from "react"
import { toast } from "sonner"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { AssignableTechnician, ShiftItem } from "@/lib/types"
import { Button } from "@/shared/ui/button"
import { EmptyState, ErrorState, Skeleton } from "@/shared/ui/feedback"
import { Input } from "@/shared/ui/input"
import { cn } from "@/lib/cn"

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function ScheduleInner() {
  const queryClient = useQueryClient()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [profileId, setProfileId] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [notes, setNotes] = useState("")

  const range = useMemo(() => {
    const from = weekStart.toISOString()
    const to = addDays(weekStart, 7).toISOString()
    return { from, to }
  }, [weekStart])

  const shiftsQuery = useQuery({
    queryKey: ["shifts", range],
    queryFn: () =>
      apiFetch<ShiftItem[]>(
        `/api/v1/shifts?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
      ),
  })

  const techsQuery = useQuery({
    queryKey: ["technicians"],
    queryFn: () => apiFetch<AssignableTechnician[]>("/api/v1/technicians"),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<ShiftItem>("/api/v1/shifts", {
        method: "POST",
        body: JSON.stringify({
          profile_id: profileId,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          notes: notes.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Shift added")
      setNotes("")
      void queryClient.invalidateQueries({ queryKey: ["shifts"] })
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : "Could not add shift"),
  })

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, ShiftItem[]>()
    for (const day of days) {
      map.set(day.toDateString(), [])
    }
    for (const shift of shiftsQuery.data ?? []) {
      const key = new Date(shift.startsAt).toDateString()
      const list = map.get(key) ?? []
      list.push(shift)
      map.set(key, list)
    }
    return map
  }, [days, shiftsQuery.data])

  function prevWeek(): void {
    setWeekStart((w) => addDays(w, -7))
  }

  function nextWeek(): void {
    setWeekStart((w) => addDays(w, 7))
  }

  function thisWeek(): void {
    setWeekStart(startOfWeek(new Date()))
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={prevWeek}>
            ← Prev
          </Button>
          <Button variant="secondary" onClick={thisWeek}>
            This week
          </Button>
          <Button variant="secondary" onClick={nextWeek}>
            Next →
          </Button>
        </div>
        <p className="font-mono text-sm text-text-muted">
          {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {" – "}
          {addDays(weekStart, 6).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <section className="rounded-[6px] border border-border bg-surface p-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
          Add shift
        </h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!profileId || !startsAt || !endsAt) {
              toast.error("Technician and times are required")
              return
            }
            createMutation.mutate()
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-text">Technician</span>
            <select
              className="h-9 rounded-[4px] border border-border bg-bg px-3 text-sm text-text"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              required
            >
              <option value="">Select technician</option>
              {(techsQuery.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Starts"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
          <Input
            label="Ends"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="sm:col-span-2 lg:col-span-3"
          />
          <div className="flex items-end">
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              Add shift
            </Button>
          </div>
        </form>
      </section>

      {shiftsQuery.isLoading ? (
        <Skeleton className="h-48" />
      ) : shiftsQuery.isError ? (
        <ErrorState
          message="Could not load shifts."
          onRetry={() => void shiftsQuery.refetch()}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((day) => {
            const key = day.toDateString()
            const shifts = shiftsByDay.get(key) ?? []
            const isToday = day.toDateString() === new Date().toDateString()
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[120px] rounded-[6px] border border-border bg-surface p-3",
                  isToday && "ring-1 ring-primary/40",
                )}
              >
                <p className="text-xs font-medium uppercase tracking-[0.04em] text-text-muted">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p className="font-mono text-sm tabular-nums text-text">
                  {day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {shifts.length === 0 ? (
                    <li className="text-xs text-text-muted">—</li>
                  ) : (
                    shifts.map((shift) => (
                      <li
                        key={shift.id}
                        className="rounded-[4px] border border-border bg-bg-muted px-2 py-1.5 text-xs"
                      >
                        <p className="font-medium text-text">{shift.profileName}</p>
                        <p className="font-mono text-text-muted">
                          {formatTime(shift.startsAt)}–{formatTime(shift.endsAt)}
                        </p>
                        {shift.notes ? (
                          <p className="mt-1 text-text-muted">{shift.notes}</p>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {(shiftsQuery.data ?? []).length === 0 && !shiftsQuery.isLoading ? (
        <EmptyState message="No shifts scheduled this week." />
      ) : null}
    </div>
  )
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function ScheduleShell() {
  return (
    <Suspense fallback={<Skeleton className="h-48" />}>
      <ScheduleInner />
    </Suspense>
  )
}
