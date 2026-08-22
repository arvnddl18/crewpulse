"use client"

import dynamic from "next/dynamic"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { apiFetch } from "@/lib/api-client"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import type { MapPayload } from "@/lib/types"

const LeafletMap = dynamic(() => import("./leaflet-map-inner"), { ssr: false })

export function InteractiveMapShell() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery<MapPayload>({
    queryKey: ["board", "map"],
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
          void queryClient.invalidateQueries({ queryKey: ["board", "map"] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-text">Live map</h1>
        <p className="text-sm text-text-muted">
          Real-time technician GPS positions across Davao North.
        </p>
      </div>

      <div className="h-[calc(100vh-8rem)] rounded-[6px] border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center bg-bg-muted">
            <p className="text-sm text-text-muted">Loading map…</p>
          </div>
        ) : isError ? (
          <div className="flex h-full items-center justify-center bg-bg-muted">
            <p className="text-sm text-[var(--signal-red)]">Failed to load map data.</p>
          </div>
        ) : (
          <LeafletMap data={data!} />
        )}
      </div>
    </div>
  )
}
