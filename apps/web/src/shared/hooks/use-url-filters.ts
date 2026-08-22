"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

export type UrlFilterState = {
  team: string
  status: string
  priority: string
  q: string
  overdue: string
}

export function useUrlFilters(): {
  filters: UrlFilterState
  setFilter: (key: keyof UrlFilterState, value: string) => void
} {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(
    (): UrlFilterState => ({
      team: searchParams.get("team") ?? "",
      status: searchParams.get("status") ?? "",
      priority: searchParams.get("priority") ?? "",
      q: searchParams.get("q") ?? "",
      overdue: searchParams.get("overdue") ?? "",
    }),
    [searchParams],
  )

  const setFilter = useCallback(
    (key: keyof UrlFilterState, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  return { filters, setFilter }
}
