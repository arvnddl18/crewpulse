"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"
import { apiFetch } from "@/lib/api-client"
import type { MapPayload } from "@/lib/types"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { teamBarClass } from "@/shared/ui/status-chip"
import { EmptyState, ErrorState, Skeleton } from "@/shared/ui/feedback"
import { cn } from "@/lib/cn"

function normalizePoints(
  points: Array<{ lat: number; lng: number }>,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (points.length === 0) {
    return { minLat: 14.4, maxLat: 14.8, minLng: 120.9, maxLng: 121.2 }
  }
  let minLat = points[0]!.lat
  let maxLat = points[0]!.lat
  let minLng = points[0]!.lng
  let maxLng = points[0]!.lng
  for (const p of points) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  }
  const pad = 0.02
  return {
    minLat: minLat - pad,
    maxLat: maxLat + pad,
    minLng: minLng - pad,
    maxLng: maxLng + pad,
  }
}

function toPercent(
  lat: number,
  lng: number,
  bounds: ReturnType<typeof normalizePoints>,
): { x: number; y: number } {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100
  const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100
  return { x: Math.min(98, Math.max(2, x)), y: Math.min(98, Math.max(2, y)) }
}

export function DispatcherMapPanel() {
  const queryClient = useQueryClient()
  const mapQuery = useQuery({
    queryKey: ["board-map"],
    queryFn: () => apiFetch<MapPayload>("/api/v1/board/map"),
    refetchInterval: 30_000,
  })

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel("map-pings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "technician_location_pings" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["board-map"] })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])

  const payload = mapQuery.data
  const allPoints = useMemo(() => {
    if (!payload) return []
    return [
      ...payload.technicians.map((t) => ({ lat: t.lat, lng: t.lng })),
      ...payload.sites.map((s) => ({ lat: s.lat, lng: s.lng })),
    ]
  }, [payload])
  const bounds = normalizePoints(allPoints)

  if (mapQuery.isLoading) {
    return <Skeleton className="h-[420px]" />
  }
  if (mapQuery.isError) {
    return (
      <ErrorState
        message="Could not load map."
        onRetry={() => void mapQuery.refetch()}
      />
    )
  }
  if (!payload) {
    return null
  }

  const empty = payload.technicians.length === 0 && payload.sites.length === 0

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        Foreground GPS only. Dots show last ping age; squares are job sites with coordinates.
      </p>

      {empty ? (
        <EmptyState message="No location pings or geocoded sites yet. Technicians must opt in and open an active job." />
      ) : (
        <div
          className="relative h-[420px] overflow-hidden rounded-[6px] border border-border bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] bg-bg-muted"
          role="img"
          aria-label="Dispatcher map"
        >
          {payload.sites.map((site) => {
            const { x, y } = toPercent(site.lat, site.lng, bounds)
            return (
              <div
                key={site.workOrderId}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
                title={`${site.number} — ${site.siteAddress}`}
              >
                <span className="block h-3 w-3 rotate-45 border border-primary bg-primary/30" />
                <span className="mt-1 block whitespace-nowrap font-mono text-[10px] text-text-muted">
                  {site.number}
                </span>
              </div>
            )
          })}

          {payload.technicians.map((tech) => {
            const { x, y } = toPercent(tech.lat, tech.lng, bounds)
            const stale = tech.ageSeconds > 90
            return (
              <div
                key={tech.profileId}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
                title={`${tech.fullName} · ${tech.workOrderNumber} · ${tech.ageSeconds}s ago`}
              >
                <span
                  className={cn(
                    "block h-4 w-4 rounded-full border-2 border-bg",
                    teamBarClass(tech.teamColor),
                    stale && "opacity-40",
                  )}
                />
                <span className="mt-0.5 block max-w-[120px] truncate text-[10px] text-text">
                  {tech.fullName}
                </span>
                <span className="font-mono text-[10px] text-text-muted">{tech.ageSeconds}s</span>
              </div>
            )
          })}
        </div>
      )}

      {payload.technicians.length > 0 ? (
        <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {payload.technicians.map((tech) => (
            <li
              key={tech.profileId}
              className="rounded-[4px] border border-border bg-surface px-3 py-2"
            >
              <span className="font-medium">{tech.fullName}</span>
              <span className="ml-2 font-mono text-xs text-text-muted">{tech.workOrderNumber}</span>
              <span className="block text-xs text-text-muted">
                Last ping {tech.ageSeconds}s ago
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
