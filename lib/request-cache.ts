/**
 * A small GET cache with in-flight de-duplication and stale-while-revalidate.
 *
 * Why this exists: the app had no client cache at all, so every mount refetched
 * from scratch. Worse, several independent components fetch the SAME endpoint
 * at the same time — the credit-card list is requested by the transactions
 * page, the transaction form, the recurring modal and the app-wide colour sync,
 * so opening the form on /transactions fired three or four identical requests
 * concurrently. This collapses those into one.
 *
 * Deliberately tiny rather than pulling in TanStack Query: it only needs to
 * cover authenticated GETs that return JSON, and it can be adopted one call
 * site at a time without rewriting every screen's data flow. If the app later
 * grows to need mutations, optimistic updates and window-focus revalidation,
 * swapping this for TanStack Query is the natural next step.
 *
 * Semantics:
 *   - fresh  (age < ttlMs)      -> cached value, no request
 *   - stale  (age < staleMs)    -> cached value returned immediately, and a
 *                                  background revalidation is kicked off
 *   - beyond staleMs / missing  -> awaited network fetch
 *
 * Not persisted; a full page reload starts cold. That's intentional — stale
 * financial figures surviving a reload would be worse than one extra request.
 */

import { apiClient } from "@/lib/apiClient"

interface Entry {
  data: unknown
  /** epoch ms when this was written */
  at: number
}

const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()

const DEFAULT_TTL_MS = 30_000
const DEFAULT_STALE_MS = 5 * 60_000

export interface CachedJsonOptions {
  /** Serve from cache without any request below this age. Default 30s. */
  ttlMs?: number
  /** Serve stale + revalidate in the background below this age. Default 5m. */
  staleMs?: number
  /** Skip the cache and force a network round-trip (still de-duplicated). */
  force?: boolean
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await apiClient(url)
  const json = await res.json().catch(() => ({}))
  if (!res.ok || (json as any)?.status === "error") {
    throw new Error((json as any)?.message || `Request failed: ${res.status}`)
  }
  return json
}

/**
 * De-duplicated fetch: concurrent callers for the same URL share one request
 * and one parse, rather than each issuing their own.
 */
function dedupedFetch(url: string): Promise<unknown> {
  const existing = inflight.get(url)
  if (existing) return existing

  const p = fetchJson(url)
    .then((json) => {
      cache.set(url, { data: json, at: Date.now() })
      return json
    })
    .finally(() => {
      inflight.delete(url)
    })

  inflight.set(url, p)
  return p
}

export async function cachedJson<T = unknown>(
  url: string,
  { ttlMs = DEFAULT_TTL_MS, staleMs = DEFAULT_STALE_MS, force = false }: CachedJsonOptions = {},
): Promise<T> {
  if (force) {
    cache.delete(url)
    return dedupedFetch(url) as Promise<T>
  }

  const hit = cache.get(url)
  if (hit) {
    const age = Date.now() - hit.at
    if (age < ttlMs) return hit.data as T

    if (age < staleMs) {
      // Revalidate without making the caller wait. Errors are swallowed on
      // purpose: the caller already has usable data, and surfacing a
      // background failure as a thrown error would be surprising.
      void dedupedFetch(url).catch(() => {})
      return hit.data as T
    }
  }

  return dedupedFetch(url) as Promise<T>
}

/**
 * Drop cached entries whose URL contains `fragment`.
 *
 * Call after a write so the next read re-fetches — e.g. after adding a card,
 * `invalidateCache("configurations/listing")`. Matching on a substring keeps
 * call sites from having to reconstruct exact query strings.
 */
export function invalidateCache(fragment: string): void {
  for (const key of Array.from(cache.keys())) {
    if (key.includes(fragment)) cache.delete(key)
  }
}

/** Clear everything — used on logout so the next user starts cold. */
export function clearCache(): void {
  cache.clear()
  inflight.clear()
}
