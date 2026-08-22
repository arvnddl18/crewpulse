"use client"

import { HEARTBEAT_INTERVAL_MS } from "@crewpulse/domain"
import { useEffect } from "react"
import { apiFetch } from "@/lib/api-client"

export function useHeartbeat(enabled = true): void {
  useEffect(() => {
    if (!enabled) {
      return
    }
    let cancelled = false

    const tick = async (): Promise<void> => {
      if (cancelled) return
      try {
        await apiFetch("/api/v1/presence/heartbeat", { method: "POST" })
      } catch {
        // Heartbeat failures are non-fatal; board will show stale/offline.
      }
    }

    void tick()
    const id = window.setInterval(() => {
      void tick()
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled])
}
