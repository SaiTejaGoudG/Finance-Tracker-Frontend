/**
 * apiClient – authenticated fetch wrapper
 *
 * - Automatically injects `Authorization: Bearer <token>` from AuthContext
 * - On 401: silently refreshes the access token once, then retries
 * - Passes `credentials: "include"` so httpOnly refresh-token cookie is sent
 *
 * Usage (same signature as fetch):
 *   import { apiClient } from "@/lib/apiClient"
 *   const res = await apiClient("/api/endpoint", { method: "POST", body: ... })
 */

import { apiUrl } from "@/lib/api"

// We can't call React hooks outside components, so we read from the context
// object directly via a module-level singleton reference that the AuthProvider
// writes to once it mounts.
let _getToken: (() => string | null) | null = null
let _refreshToken: (() => Promise<string | null>) | null = null
let _forceLogout: (() => void) | null = null

/**
 * Called by AuthProvider on mount to register the token accessors.
 * This lets apiClient work without being inside a React tree.
 */
export function registerAuthHandlers(
  getToken: () => string | null,
  refreshToken: () => Promise<string | null>,
  forceLogout: () => void,
) {
  _getToken = getToken
  _refreshToken = refreshToken
  _forceLogout = forceLogout
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function doFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = _getToken?.()

  const headers = new Headers(options.headers)
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json")
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(url, {
    ...options,
    credentials: "include",
    headers,
  })
}

export async function apiClient(url: string, options: RequestInit = {}): Promise<Response> {
  let res = await doFetch(url, options)

  // Token expired → try refresh once
  if (res.status === 401 && _refreshToken) {
    const newToken = await _refreshToken()
    if (newToken) {
      // Retry original request with the new token
      res = await doFetch(url, options)
    } else {
      // Refresh failed (e.g. "Refresh token is required" / cookie expired).
      // Clear session and send user back to login.
      _forceLogout?.()
    }
    return res
  }

  // Also catch explicit session-expired payloads that come back as 200
  // e.g. { "status": "error", "message": "Refresh token is required" }
  if (res.status === 200) {
    const cloned = res.clone()
    try {
      const body = await cloned.json()
      if (
        body?.status === "error" &&
        typeof body?.message === "string" &&
        body.message.toLowerCase().includes("refresh token")
      ) {
        _forceLogout?.()
      }
    } catch {
      // not JSON or not a session error — ignore
    }
  }

  return res
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export const authFetch = {
  get(path: string, params?: Record<string, string | number | undefined>) {
    return apiClient(apiUrl(path, params))
  },

  post(path: string, body: unknown) {
    return apiClient(apiUrl(path), {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

  put(path: string, body: unknown) {
    return apiClient(apiUrl(path), {
      method: "PUT",
      body: JSON.stringify(body),
    })
  },

  delete(path: string, body?: unknown) {
    return apiClient(apiUrl(path), {
      method: "DELETE",
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  },
}
