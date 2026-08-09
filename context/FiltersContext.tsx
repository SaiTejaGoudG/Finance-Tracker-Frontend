"use client"

/**
 * FiltersContext — shared date-range / owner filters for the analytics surfaces.
 *
 * The URL query string is the source of truth. That gives us two things the old
 * single-page dashboard could not do:
 *
 *   1. Deep links — /analytics/expenses?startDate=2026-01-01&endDate=2026-06-30
 *      reproduces exactly what the sender was looking at.
 *   2. Filters survive navigation between routes without a provider needing to
 *      live above the router.
 *
 * sessionStorage is a fallback so that navigating via a link WITHOUT query
 * params (e.g. the sidebar) still restores the user's last selection rather
 * than silently resetting to the default 12-month window.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
} from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { defaultFilters } from "@/components/new-dashboard/use-overview-data"
import type { OverviewFilters } from "@/components/new-dashboard/use-overview-data"

const SS_KEY = "ft_overview_filters"

// ─── Serialisation ────────────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Only accept well-formed values — a hand-edited URL shouldn't break the app. */
function sanitise(raw: Partial<OverviewFilters> | null): OverviewFilters | null {
  if (!raw) return null
  const { startDate, endDate, ownerType } = raw
  if (typeof startDate !== "string" || !ISO_DATE.test(startDate)) return null
  if (typeof endDate !== "string" || !ISO_DATE.test(endDate)) return null
  if (startDate > endDate) return null
  return {
    startDate,
    endDate,
    ownerType: typeof ownerType === "string" ? ownerType : "",
  }
}

function readSession(): OverviewFilters | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY)
    return raw ? sanitise(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeSession(f: OverviewFilters) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(f))
  } catch {
    /* private mode may block writes */
  }
}

/** Serialise filters to a query string, omitting empty ownerType. */
export function filtersToQuery(f: OverviewFilters): string {
  const p = new URLSearchParams({ startDate: f.startDate, endDate: f.endDate })
  if (f.ownerType) p.set("ownerType", f.ownerType)
  return p.toString()
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface FiltersContextValue {
  filters: OverviewFilters
  setFilters: (next: OverviewFilters) => void
  /** Append the current filters to a path, so nav links carry them forward. */
  withFilters: (path: string) => string
}

const FiltersContext = createContext<FiltersContextValue | null>(null)

function FiltersProviderInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Resolution order: URL → sessionStorage → defaults
  const filters = useMemo<OverviewFilters>(() => {
    const fromUrl = sanitise({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      ownerType: searchParams.get("ownerType") ?? "",
    })
    if (fromUrl) return fromUrl

    if (typeof window !== "undefined") {
      const stored = readSession()
      if (stored) return stored
    }
    return defaultFilters()
  }, [searchParams])

  // Mirror to sessionStorage so a param-less navigation can restore it
  useEffect(() => {
    writeSession(filters)
  }, [filters])

  const setFilters = useCallback(
    (next: OverviewFilters) => {
      writeSession(next)
      // replace, not push — filter tweaks shouldn't each become a back-button step
      router.replace(`${pathname}?${filtersToQuery(next)}`, { scroll: false })
    },
    [router, pathname],
  )

  const withFilters = useCallback(
    (path: string) => `${path}?${filtersToQuery(filters)}`,
    [filters],
  )

  const value = useMemo(
    () => ({ filters, setFilters, withFilters }),
    [filters, setFilters, withFilters],
  )

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}

/**
 * useSearchParams() requires a Suspense boundary in the App Router, so the
 * provider is split the same way app/login/page.tsx is.
 */
export function FiltersProvider({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={null}>
      <FiltersProviderInner>{children}</FiltersProviderInner>
    </React.Suspense>
  )
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext)
  if (!ctx) {
    throw new Error("useFilters must be used inside <FiltersProvider>")
  }
  return ctx
}
