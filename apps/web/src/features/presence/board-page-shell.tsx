"use client"

import { Suspense, useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PresenceBoardShell, type BoardTab } from "@/features/presence/presence-board"
import { cn } from "@/lib/cn"

const TABS: { value: BoardTab; label: string }[] = [
  { value: "technicians", label: "Technicians" },
  { value: "work-orders", label: "Work orders" },
]

function isValidTab(v: string | null): v is BoardTab {
  return v === "technicians" || v === "work-orders"
}

function BoardTabsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const raw = searchParams.get("tab")
  const tab: BoardTab = isValidTab(raw) ? raw : "technicians"

  const setTab = useCallback(
    (next: BoardTab) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", next)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="board-heading">
            Live board
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Technician presence and work order tracking.
          </p>
        </div>
        <div className="flex gap-1" role="tablist">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={cn(
                "rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors duration-[120ms]",
                "active:scale-[0.97]",
                tab === value
                  ? "border-b-2 border-primary text-text"
                  : "text-text-muted hover:text-text",
              )}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <PresenceBoardShell tab={tab} />
    </>
  )
}

export function BoardPageShell() {
  return (
    <Suspense fallback={null}>
      <BoardTabsInner />
    </Suspense>
  )
}
