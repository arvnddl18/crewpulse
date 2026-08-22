"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"
import { apiFetch } from "@/lib/api-client"
import type { NotificationItem } from "@/lib/types"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { cn } from "@/lib/cn"
import { Button } from "@/shared/ui/button"

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<NotificationItem[]>("/api/v1/notifications"),
    refetchInterval: 30_000,
  })

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications"] })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])

  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", onDocClick)
    }
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  const readOne = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const readAll = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const items = notificationsQuery.data ?? []
  const unread = items.filter((n) => !n.readAt).length

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-[6px] border border-border hover:bg-[var(--surface-hover)]"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-[6px] border border-border bg-surface shadow-[var(--shadow-2)]"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => readAll.mutate()}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-text-muted">
                No notifications
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full border-b border-border px-3 py-3 text-left text-sm transition-colors hover:bg-[var(--surface-hover)]",
                      !n.readAt && "bg-[var(--surface-hover)]/40",
                    )}
                    onClick={() => {
                      if (!n.readAt) readOne.mutate(n.id)
                    }}
                  >
                    <p className="font-medium">{n.title}</p>
                    {n.body ? (
                      <p className="mt-0.5 text-xs text-text-muted">{n.body}</p>
                    ) : null}
                    <time className="mt-1 block font-mono text-[10px] text-text-muted">
                      {new Date(n.createdAt).toLocaleString()}
                    </time>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
