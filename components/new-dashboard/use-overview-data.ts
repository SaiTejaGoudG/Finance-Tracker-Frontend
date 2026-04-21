"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { format, startOfMonth, subMonths, endOfMonth } from "date-fns"

// ─── Shared types ──────────────────────────────────────────────────────────────

export type DateRange = { startDate: string; endDate: string }

export type SummaryData = {
  totalIncome: number
  totalExpense: number
  totalInvestment: number
  balance: number
  dateRange: DateRange
}

export type TrendMonth = {
  label: string
  shortLabel: string
  Income: number
  Expense: number
  Investment: number
}
export type TrendsData = { data: TrendMonth[]; dateRange: DateRange }

export type DistributionItem = { category: string; amount: number; percentage: number }
export type DistributionData = { type: string; total: number; data: DistributionItem[] }

export type PettyCashMonth = { month: string; year: string; label: string; amount: number }
export type PettyCashData  = { data: PettyCashMonth[]; total: number; dateRange: DateRange }

// ─── Filters ──────────────────────────────────────────────────────────────────

export type OverviewFilters = {
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  ownerType: string   // "" = all
}

export const defaultFilters = (): OverviewFilters => ({
  startDate: format(startOfMonth(subMonths(new Date(), 11)), "yyyy-MM-dd"),
  endDate:   format(endOfMonth(new Date()), "yyyy-MM-dd"),
  ownerType: "",
})

// ─── Generic fetch helper ─────────────────────────────────────────────────────

async function fetchApi<T>(path: string, filters: OverviewFilters, extra?: Record<string, string>): Promise<T> {
  const params = new URLSearchParams({
    startDate: filters.startDate,
    endDate:   filters.endDate,
    ...(filters.ownerType ? { owner_type: filters.ownerType } : {}),
    ...extra,
  })
  const res = await apiClient(apiUrl(path, params))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.status !== "success") throw new Error(json.message || "API error")
  return json.data as T
}

// ─── Individual hooks (used inside the main hook) ─────────────────────────────

type AsyncState<T> = { data: T | null; loading: boolean; error: string | null }

function useAsyncFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch((e)   => { if (!cancelled) setState({ data: null, loading: false, error: e.message }) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}

// ─── Main hook — all 4 endpoints ─────────────────────────────────────────────

export function useOverviewData(filters: OverviewFilters) {
  const deps = [filters.startDate, filters.endDate, filters.ownerType]

  const summary  = useAsyncFetch<SummaryData>(() => fetchApi("overview/summary", filters), deps)
  const trends   = useAsyncFetch<TrendsData>(() => fetchApi("analytics/trends", filters), deps)
  const expDist  = useAsyncFetch<DistributionData>(() => fetchApi("analytics/distribution", filters, { type: "expense" }), deps)
  const incDist  = useAsyncFetch<DistributionData>(() => fetchApi("analytics/distribution", filters, { type: "income" }), deps)
  const petty    = useAsyncFetch<PettyCashData>(() => fetchApi("analytics/petty-cash", filters), deps)

  return { summary, trends, expDist, incDist, petty }
}
