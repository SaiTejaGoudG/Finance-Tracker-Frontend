"use client"

/**
 * Credit card list + app-wide label colour sync.
 *
 * The card list was being fetched independently by five places — the
 * transactions page, the transaction form, the recurring modal, the
 * configurations page and the colour sync below — so opening the transaction
 * form on /transactions fired three or four identical concurrent requests.
 * Everything here shares one de-duplicated, cached request via
 * lib/request-cache, so those collapse into a single round trip.
 */

import { useEffect, useState, useCallback } from "react"
import { apiUrl } from "@/lib/api"
import { cachedJson, invalidateCache } from "@/lib/request-cache"
import { setCardColors } from "@/lib/card-meta"

export interface CreditCardRow {
  id: number
  card_name: string
  card_number?: string
  card_limit?: number
  billing_cycle_date?: number
  due_days?: number
  color?: string | null
}

// `limit` is generous because configurations/listing paginates at 25 by
// default and every consumer here wants the whole list, not one page.
const CARDS_URL = () => apiUrl("configurations/listing", { limit: 200 })

/** Shared fetch — every consumer below goes through this one cached URL. */
export async function fetchCreditCards(force = false): Promise<CreditCardRow[]> {
  const json = await cachedJson<any>(CARDS_URL(), { force })
  // The listing endpoint nests its page under data.data.
  return Array.isArray(json?.data?.data) ? json.data.data : []
}

/** Call after adding/editing/deleting a card so the next read re-fetches. */
export function invalidateCreditCards(): void {
  invalidateCache("configurations/listing")
}

/**
 * The card list, for any component that needs it. Concurrent mounts share
 * one request; a repeat mount within the TTL does no network call at all.
 */
export function useCreditCards(enabled = true) {
  const [cards, setCards] = useState<CreditCardRow[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      setCards(await fetchCreditCards(force))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load credit cards")
      setCards([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    ;(async () => {
      try {
        const rows = await fetchCreditCards()
        if (!cancelled) setCards(rows)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load credit cards")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { cards, loading, error, refetch: load }
}

/**
 * Registers each card's custom label colour into lib/card-meta.ts's override
 * cache, so getCardColor(name) picks it up wherever a card-name badge is
 * already rendered — All Transactions, Business, Borrowings & Lending — with
 * no changes at those call sites. Call once from an authenticated top-level
 * component (LayoutWrapper), not per page.
 */
export function useCardColorSync(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    ;(async () => {
      try {
        const rows = await fetchCreditCards()
        if (cancelled) return
        const overrides: Record<string, string | null | undefined> = {}
        for (const row of rows) {
          if (row.card_name) overrides[row.card_name] = row.color
        }
        setCardColors(overrides)
      } catch {
        // Best-effort — a failure here just means custom card colours don't
        // show up yet; the neutral badge styling still works fine.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])
}
