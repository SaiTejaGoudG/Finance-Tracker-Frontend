"use client"

/**
 * Categories = built-in list (lib/data.ts) + the user's own additions.
 *
 * transactions.category is a free-text column, so a custom category needs no
 * schema change to be *used* — this only tracks which custom names to offer in
 * the dropdowns. Built-ins stay in the frontend so they can change without a
 * data migration; only the user's additions are stored server-side.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { setCustomCategoryMeta, registerCategoryMeta } from "@/lib/tx-meta"
import {
  incomeCategories,
  expenseCategories,
  investmentCategories,
  assetCategories,
  creditCategories,
} from "@/lib/data"

/** Must match VALID_TYPES in the backend categoriesService. */
export type CategoryType =
  | "Income"
  | "Expense"
  | "Investment"
  | "Asset"
  | "Credit Card"
  | "Petty Cash"

export interface UserCategory {
  id: number
  name: string
  transaction_type: CategoryType
  created_at?: string
  /** true = shared default (seeded server-side, not deletable by users) */
  is_default?: boolean
  /** User-chosen emoji for this category, if they set one. Falls back to
   *  lib/tx-meta.ts's static default when null/absent. */
  emoji?: string | null
  /** User-chosen icon background color (hex), if they set one. Falls back
   *  to lib/tx-meta.ts's static default when null/absent. */
  color?: string | null
}

/** One entry per transaction type requested in a create call. */
interface CreateCategoryResult {
  transaction_type: CategoryType
  status: "created" | "exists"
  category?: UserCategory
}

const BUILT_IN: Record<CategoryType, string[]> = {
  Income: incomeCategories,
  Expense: expenseCategories,
  Investment: investmentCategories,
  Asset: assetCategories,
  "Credit Card": creditCategories,
  // Petty cash is spent on the same things as ordinary expenses
  "Petty Cash": expenseCategories,
}

/** Built-in options for a type, with no custom additions. */
export function builtInCategories(type: CategoryType): string[] {
  return BUILT_IN[type] ?? expenseCategories
}

/** Case-insensitive dedupe, then alphabetical. */
function mergeNames(builtIn: string[], custom: string[]): string[] {
  const seen = new Set(builtIn.map((n) => n.toLowerCase()))
  const extra = custom.filter((n) => !seen.has(n.toLowerCase()))
  return [...builtIn, ...extra].sort((a, b) => a.localeCompare(b))
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCategories(type: CategoryType) {
  const [custom, setCustom] = useState<UserCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustom = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient(
        apiUrl("categories/listing", { transaction_type: type }),
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.status === "error") {
        throw new Error(json?.message || "Failed to load categories")
      }
      setCustom(Array.isArray(json.data) ? json.data : [])
    } catch (e) {
      // A failure here must not block the form — fall back to built-ins only
      setError(e instanceof Error ? e.message : "Failed to load categories")
      setCustom([])
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    fetchCustom()
  }, [fetchCustom])

  const options = useMemo(
    () => mergeNames(builtInCategories(type), custom.map((c) => c.name)),
    [type, custom],
  )

  /**
   * Create a custom category. Returns the created name on success so the caller
   * can select it immediately, or null if it failed.
   */
  const createCategory = useCallback(
    async (rawName: string): Promise<string | null> => {
      const name = rawName.trim()
      if (!name) return null

      // Already offered — nothing to create, just hand it back
      if (options.some((o) => o.toLowerCase() === name.toLowerCase())) {
        return name
      }

      const res = await apiClient(apiUrl("categories/store"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, transaction_type: type }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok || json?.status === "error") {
        throw new Error(json?.message || "Failed to create category")
      }

      const results: CreateCategoryResult[] = Array.isArray(json.data) ? json.data : []
      const mine = results.find((r) => r.transaction_type === type)

      if (mine?.category) {
        setCustom((prev) => [...prev, mine.category as UserCategory])
        return mine.category.name
      }
      return name
    },
    [type, options],
  )

  return { options, custom, loading, error, refetch: fetchCustom, createCategory }
}

// ─── Management hook (all types at once, for Configurations) ──────────────────

export function useAllCustomCategories() {
  const [custom, setCustom] = useState<UserCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient(apiUrl("categories/listing"))
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.status === "error") {
        throw new Error(json?.message || "Failed to load categories")
      }
      const rows: UserCategory[] = Array.isArray(json.data) ? json.data : []
      // This management view is for the user's OWN additions only — the
      // listing endpoint now also returns shared defaults (seeded
      // server-side), which aren't deletable and would just clutter this list.
      setCustom(rows.filter((c) => !c.is_default))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  /**
   * Create one category across any number of transaction types in a single
   * request. `emoji`/`color` are optional — omit either to use
   * lib/tx-meta.ts's static default (or the generic 💰/gray fallback if the
   * name isn't in that map). Returns which types it was actually added for
   * vs. which already had it, so the caller can summarize both outcomes in
   * one toast instead of treating a partial match as an error.
   */
  const create = useCallback(
    async (
      name: string,
      types: CategoryType[],
      emoji?: string,
      color?: string,
    ): Promise<{ createdTypes: CategoryType[]; existingTypes: CategoryType[] }> => {
      const res = await apiClient(apiUrl("categories/store"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          transaction_type: types,
          emoji: emoji?.trim() || undefined,
          color: color?.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.status === "error") {
        throw new Error(json?.message || "Failed to create category")
      }

      const results: CreateCategoryResult[] = Array.isArray(json.data) ? json.data : []
      const createdRows = results
        .filter((r) => r.status === "created" && r.category)
        .map((r) => r.category as UserCategory)

      setCustom((prev) => [...prev, ...createdRows])
      // Reflect the emoji/color app-wide for the rest of this session
      // immediately, without waiting for the next useCategorySync fetch.
      if (createdRows[0]?.emoji || createdRows[0]?.color) {
        registerCategoryMeta(name.trim(), {
          emoji: createdRows[0]?.emoji,
          color: createdRows[0]?.color,
        })
      }

      return {
        createdTypes: results.filter((r) => r.status === "created").map((r) => r.transaction_type),
        existingTypes: results.filter((r) => r.status === "exists").map((r) => r.transaction_type),
      }
    },
    [],
  )

  /**
   * Edit an existing custom category's name, emoji and/or color. Any field
   * left undefined is left unchanged server-side; passing an empty string
   * for emoji/color clears that override back to the static default.
   */
  const update = useCallback(
    async (
      id: number,
      changes: { name?: string; emoji?: string | null; color?: string | null },
    ): Promise<UserCategory> => {
      const body: Record<string, unknown> = {}
      if (changes.name !== undefined) body.name = changes.name.trim()
      if (changes.emoji !== undefined) body.emoji = changes.emoji?.trim() || null
      if (changes.color !== undefined) body.color = changes.color?.trim() || null

      const res = await apiClient(apiUrl(`categories/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.status === "error") {
        throw new Error(json?.message || "Failed to update category")
      }

      const updated: UserCategory = json.data
      setCustom((prev) => prev.map((c) => (c.id === id ? updated : c)))
      registerCategoryMeta(updated.name, { emoji: updated.emoji, color: updated.color })

      return updated
    },
    [],
  )

  const remove = useCallback(async (id: number) => {
    const res = await apiClient(apiUrl(`categories/${id}`), { method: "DELETE" })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json?.status === "error") {
      throw new Error(json?.message || "Failed to delete category")
    }
    setCustom((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { custom, loading, error, refetch, create, update, remove }
}

// ─── App-wide emoji sync ───────────────────────────────────────────────────────

/**
 * Fetches every category visible to the user (all types, defaults + custom)
 * once and registers any custom emoji/color into lib/tx-meta.ts's override
 * cache, so getCategoryMeta(name) picks them up wherever it's already
 * called — transaction list, dashboard charts, the category picker — with
 * no changes needed at those call sites. Call this once from an
 * authenticated top-level component (LayoutWrapper), not per-page, to avoid
 * refetching on every route.
 */
export function useCategorySync(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiClient(apiUrl("categories/listing"))
        const json = await res.json().catch(() => ({}))
        if (cancelled || !res.ok || json?.status === "error") return
        const rows: UserCategory[] = Array.isArray(json.data) ? json.data : []
        const overrides: Record<string, { emoji?: string | null; color?: string | null }> = {}
        for (const row of rows) {
          if (row.emoji || row.color) {
            overrides[row.name] = { emoji: row.emoji, color: row.color }
          }
        }
        setCustomCategoryMeta(overrides)
      } catch {
        // Best-effort — a failure here just means custom emoji/color don't
        // show up yet; the static CATEGORY_META fallback still works fine.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])
}
