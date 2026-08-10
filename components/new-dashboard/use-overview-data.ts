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

export type CreditCardItem = {
  card_id: string
  card_name: string
  total: number
  transaction_count: number
  percentage: number
  last_transaction_date: string | null
}
export type CreditCardMonthBucket = {
  label: string
  total: number
  [cardId: string]: number | string
}
export type CreditCardData = {
  total: number
  cards: CreditCardItem[]
  cardIds: string[]
  cardNames: Record<string, string>
  monthlyData: CreditCardMonthBucket[]
  dateRange: DateRange
}

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

// ─── Per-endpoint hooks ───────────────────────────────────────────────────────
// Each surface fetches only what it renders. Previously every one of these six
// requests fired on any dashboard load, regardless of which tab was open —
// six round-trips to render one panel.

export function useSummary(filters: OverviewFilters) {
  return useAsyncFetch<SummaryData>(
    () => fetchApi("overview/summary", filters),
    [filters.startDate, filters.endDate, filters.ownerType],
  )
}

export function useTrends(filters: OverviewFilters) {
  return useAsyncFetch<TrendsData>(
    () => fetchApi("analytics/trends", filters),
    [filters.startDate, filters.endDate, filters.ownerType],
  )
}

export function useExpenseDistribution(filters: OverviewFilters) {
  return useAsyncFetch<DistributionData>(
    () => fetchApi("analytics/distribution", filters, { type: "expense" }),
    [filters.startDate, filters.endDate, filters.ownerType],
  )
}

export function useIncomeDistribution(filters: OverviewFilters) {
  return useAsyncFetch<DistributionData>(
    () => fetchApi("analytics/distribution", filters, { type: "income" }),
    [filters.startDate, filters.endDate, filters.ownerType],
  )
}

export function usePettyCash(filters: OverviewFilters) {
  return useAsyncFetch<PettyCashData>(
    () => fetchApi("analytics/petty-cash", filters),
    [filters.startDate, filters.endDate, filters.ownerType],
  )
}

export function useCreditCardAnalytics(filters: OverviewFilters) {
  return useAsyncFetch<CreditCardData>(
    () => fetchApi("analytics/credit-cards", filters),
    [filters.startDate, filters.endDate, filters.ownerType],
  )
}

// The old composed `useOverviewData` hook was removed when the dashboard tabs
// became routes: it fetched all six endpoints on every load, so opening any tab
// paid for the other five. Each route now calls only the hooks it renders.
