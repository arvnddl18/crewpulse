"use client"

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapContainer, TileLayer, CircleMarker, Marker, Popup } from "react-leaflet"
import type { MapPayload } from "@/lib/types"
import { StatusChip } from "@/shared/ui/status-chip"

const DAVAO_NORTH: [number, number] = [7.13, 125.63]
const DEFAULT_ZOOM = 13

const TEAM_COLORS: Record<string, string> = {
  teal: "#2DD4BF",
  amber: "#F5A524",
}
const DEFAULT_COLOR = "#8B9BB4"

function teamHex(color: string): string {
  return TEAM_COLORS[color] ?? DEFAULT_COLOR
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function siteIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;background:#8B9BB4;transform:rotate(45deg);border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

type Props = { data: MapPayload }

export default function LeafletMapInner({ data }: Props) {
  return (
    <MapContainer
      center={DAVAO_NORTH}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {data.technicians.map((t) => (
        <CircleMarker
          key={t.profileId}
          center={[t.lat, t.lng]}
          radius={8}
          pathOptions={{
            color: "#fff",
            weight: 2,
            fillColor: teamHex(t.teamColor),
            fillOpacity: 1,
          }}
        >
          <Popup>
            <div className="min-w-[180px] text-sm">
              <p className="font-semibold text-text">{t.fullName}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: teamHex(t.teamColor) }}
                />
                <span className="text-xs text-text-muted">{t.teamColor} team</span>
              </div>
              {t.workOrderNumber && (
                <p className="mt-1.5 text-xs text-text-muted">
                  WO <span className="font-medium text-text">{t.workOrderNumber}</span>
                </p>
              )}
              <div className="mt-1.5">
                <StatusChip status="on_site" />
              </div>
              <p className="mt-1.5 text-[11px] text-text-muted">
                Last ping: {formatAge(t.ageSeconds)}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {data.sites.map((s) => (
        <Marker key={s.workOrderId} position={[s.lat, s.lng]} icon={siteIcon()}>
          <Popup>
            <div className="min-w-[160px] text-sm">
              <p className="font-semibold text-text">{s.number}</p>
              <p className="text-xs text-text-muted">{s.title}</p>
              <p className="mt-1 text-xs text-text-muted">{s.siteAddress}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {data.technicians.length === 0 && data.sites.length === 0 && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-bg/60">
          <p className="text-sm text-text-muted">No active pings or sites to display.</p>
        </div>
      )}
    </MapContainer>
  )
}
