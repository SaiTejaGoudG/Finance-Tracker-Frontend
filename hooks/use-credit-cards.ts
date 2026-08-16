"use client"

/**
 * App-wide credit card label color sync — the counterpart to
 * useCategorySync() in hooks/use-categories.ts, but for credit_cards.color
 * instead of user_categories.color.
 */

import { useEffect } from "react"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { setCardColors } from "@/lib/card-meta"

interface CardRow {
  card_name: string
  color?: string | null
}

/**
 * Fetches every credit card once and registers any custom label color into
 * lib/card-meta.ts's override cache, so getCardColor(name) picks it up
 * wherever a card-name badge is already rendered — All Transactions, the
 * Business ledger list, Borrowings & Lending — with no changes needed at
 * those call sites. Call this once from an authenticated top-level
 * component (LayoutWrapper), not per-page, to avoid refetching on every
 * route. `limit` is generous (configurations/listing paginates at 25 by
 * default) since this needs every card, not one page of them.
 */
export function useCardColorSync(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiClient(apiUrl("configurations/listing", { limit: 200 }))
        const json = await res.json().catch(() => ({}))
        if (cancelled || !res.ok || json?.status === "error") return
        const rows: CardRow[] = Array.isArray(json.data?.data) ? json.data.data : []
        const overrides: Record<string, string | null | undefined> = {}
        for (const row of rows) {
          if (row.card_name) overrides[row.card_name] = row.color
        }
        setCardColors(overrides)
      } catch {
        // Best-effort — a failure here just means custom card colors don't
        // show up yet; the existing neutral badge styling still works fine.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])
}
