"use client"

import {
  canStreamLocation,
  isGpsTrackingStatus,
  LOCATION_PING_INTERVAL_MS,
  type WorkOrderStatus,
} from "@crewpulse/domain"
import { useEffect, useRef } from "react"
import { apiFetch } from "@/lib/api-client"

export function useLocationStream(input: {
  workOrderId: string | null
  status: WorkOrderStatus | null
  optedIn: boolean
  enabled: boolean
}): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pageVisibleRef = useRef(true)

  useEffect(() => {
    function onVisibility(): void {
      pageVisibleRef.current = document.visibilityState === "visible"
    }
    document.addEventListener("visibilitychange", onVisibility)
    onVisibility()
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const legal =
      input.enabled &&
      input.workOrderId &&
      input.status &&
      canStreamLocation({
        optedIn: input.optedIn,
        hasActiveJob: true,
        status: input.status,
        pageVisible: pageVisibleRef.current,
      })

    if (!legal || !input.workOrderId || !input.status || !isGpsTrackingStatus(input.status)) {
      return
    }

    const workOrderId = input.workOrderId

    async function ping(): Promise<void> {
      if (document.visibilityState !== "visible") {
        return
      }
      if (!navigator.geolocation) {
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void apiFetch("/api/v1/presence/location", {
            method: "POST",
            body: JSON.stringify({
              workOrderId,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracyM: pos.coords.accuracy,
            }),
          }).catch(() => undefined)
        },
        () => undefined,
        { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 },
      )
    }

    void ping()
    timerRef.current = setInterval(() => void ping(), LOCATION_PING_INTERVAL_MS)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [input.enabled, input.optedIn, input.status, input.workOrderId])
}
