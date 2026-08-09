"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api"
import { registerAuthHandlers } from "@/lib/apiClient"

// ─── sessionStorage helpers ───────────────────────────────────────────────────
// Access tokens are short-lived (15 min) and stored in sessionStorage so they
// survive page reloads without needing a new /auth/refresh call every time.
// sessionStorage is cleared automatically when the tab is closed (good for
// security). It is NOT accessible from other tabs (unlike localStorage).

const SS_TOKEN_KEY = "ft_access_token"
const SS_USER_KEY  = "ft_user"

// ─── Refresh token (localStorage) ─────────────────────────────────────────────
//
// WHY THIS EXISTS — production auto-logout bug.
//
// The backend sets the refresh token as an httpOnly cookie, which is the right
// default. But in production the frontend is on *.vercel.app and the API is on
// *.onrender.com — different sites, so that cookie is THIRD-PARTY. Safari and
// Firefox block third-party cookies by default and Chrome increasingly does, so
// POST /auth/refresh arrived with no cookie, the backend answered "Refresh
// token is required", and the 14-minute proactive refresh tripped forceLogout.
// Symptom: signed out roughly a quarter-hour after logging in, every time.
//
// The backend already returns `refreshToken` in the response body and already
// accepts `req.body.refreshToken`, so the fix is entirely client-side: keep the
// token and present it in the body when the cookie doesn't survive the trip.
// The cookie remains the primary path where browsers still allow it.
//
// localStorage rather than sessionStorage so the 7-day refresh window actually
// applies — sessionStorage dies with the tab, which would sign the user out on
// every browser restart.
//
// Trade-off: a refresh token reachable from JS is exposed to XSS in a way an
// httpOnly cookie is not. Mitigated by the backend rotating the token on every
// refresh and capping concurrent sessions at 5. The clean long-term fix is to
// serve API and app from one site (e.g. app.example.com + api.example.com),
// which makes the cookie first-party and lets this be deleted.

const LS_REFRESH_KEY = "ft_refresh_token"

function refreshTokenGet(): string | null {
  try {
    return localStorage.getItem(LS_REFRESH_KEY)
  } catch {
    return null
  }
}

function refreshTokenSet(token: string | null | undefined) {
  if (!token) return
  try {
    localStorage.setItem(LS_REFRESH_KEY, token)
  } catch { /* private mode may block writes */ }
}

function refreshTokenClear() {
  try {
    localStorage.removeItem(LS_REFRESH_KEY)
  } catch {}
}

function ssSet(token: string, user: AuthUser) {
  try {
    sessionStorage.setItem(SS_TOKEN_KEY, token)
    sessionStorage.setItem(SS_USER_KEY, JSON.stringify(user))
  } catch { /* private/incognito may block storage writes */ }
}

function ssClear() {
  try {
    sessionStorage.removeItem(SS_TOKEN_KEY)
    sessionStorage.removeItem(SS_USER_KEY)
  } catch {}
}

// ─── Session flag cookie (for Next.js middleware) ─────────────────────────────
// The refreshToken httpOnly cookie is set by the backend (onrender.com) and is
// invisible to middleware running on the frontend domain (vercel.app) because
// cookies are domain-scoped. We set a lightweight non-sensitive flag cookie on
// the FRONTEND domain so the middleware can detect an active session.

function sessionCookieSet() {
  if (typeof document === "undefined") return
  const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `ft_session=1; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
}

function sessionCookieClear() {
  if (typeof document === "undefined") return
  document.cookie = "ft_session=; path=/; max-age=0; SameSite=Lax"
}

/**
 * Parse a JWT payload (no signature verification – backend handles that).
 * Returns { token, user } if the token is present and not yet expired,
 * null otherwise.
 */
function ssRestore(): { token: string; user: AuthUser } | null {
  try {
    const token = sessionStorage.getItem(SS_TOKEN_KEY)
    const raw   = sessionStorage.getItem(SS_USER_KEY)
    if (!token || !raw) return null

    // Decode the JWT payload (base64url → JSON)
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const payload = JSON.parse(atob(b64)) as { exp?: number }

    // Add a 30-second buffer so we don't hand out a token that's about to expire
    const expiresAt = (payload.exp ?? 0) * 1000
    if (Date.now() >= expiresAt - 30_000) {
      ssClear()
      return null
    }

    return { token, user: JSON.parse(raw) as AuthUser }
  } catch {
    ssClear()
    return null
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string
  phone?: string
  currency?: string
  timezone?: string
  date_format?: string
  avatar_url?: string
  last_login_at?: string
}

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (updates: Partial<AuthUser>) => void
  getToken: () => string | null
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Store access token in a ref (not state) so it's available synchronously
  // and doesn't trigger re-renders on every request
  const accessTokenRef = useRef<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Track in-flight refresh to avoid duplicate refresh calls
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null)

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const setTokens = useCallback((token: string, userData: AuthUser) => {
    accessTokenRef.current = token
    setAccessToken(token)
    setUser(userData)
    ssSet(token, userData)   // persist across page reloads
    sessionCookieSet()       // signal to Next.js middleware that session is active
  }, [])

  const clearTokens = useCallback(() => {
    accessTokenRef.current = null
    setAccessToken(null)
    setUser(null)
    ssClear()                // evict access token from sessionStorage
    refreshTokenClear()      // evict refresh token from localStorage
    sessionCookieClear()     // remove session flag
  }, [])

  const getToken = useCallback((): string | null => {
    return accessTokenRef.current
  }, [])

  // ─── Refresh token ──────────────────────────────────────────────────────────

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    // Deduplicate concurrent refresh calls
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    const promise = (async () => {
      try {
        // Read at call time, not via closure: the backend revokes the old token
        // on every refresh, so if another tab rotated it we must send the
        // current one rather than a revoked value.
        const stored = refreshTokenGet()

        const res = await fetch(apiUrl("auth/refresh"), {
          method: "POST",
          credentials: "include", // httpOnly cookie — primary path
          headers: { "Content-Type": "application/json" },
          // Body fallback for when the cookie is blocked as third-party.
          // The backend reads `req.cookies.refreshToken || req.body.refreshToken`.
          body: JSON.stringify(stored ? { refreshToken: stored } : {}),
        })

        if (!res.ok) {
          clearTokens()
          return null
        }

        const data = await res.json()
        if (data.status && data.data?.accessToken) {
          const { accessToken: newToken, user: userData, refreshToken } = data.data
          // Persist the rotated token, or the old one stays and dies next cycle
          refreshTokenSet(refreshToken)
          setTokens(newToken, userData)
          return newToken
        }

        clearTokens()
        return null
      } catch {
        clearTokens()
        return null
      } finally {
        refreshPromiseRef.current = null
      }
    })()

    refreshPromiseRef.current = promise
    return promise
  }, [clearTokens, setTokens])

  // forceLogout: called by apiClient when a mid-session refresh fails,
  // and by the proactive refresh timer when the refresh token has expired.
  // Accepts an optional reason shown as a banner on the login page.
  const forceLogout = useCallback((reason?: string) => {
    clearTokens()
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const url = reason ? `/login?reason=${reason}` : "/login"
      window.location.replace(url)
    }
  }, [clearTokens])

  // Register token handlers SYNCHRONOUSLY in the render body (not useEffect).
  // React runs child effects BEFORE parent effects, so if this were a useEffect,
  // child components (e.g. Dashboard) would fire their fetch before _getToken is
  // registered → 401 on every first request. Calling it here runs before any
  // child effect executes. getToken and refreshAccessToken are stable references.
  registerAuthHandlers(getToken, refreshAccessToken, forceLogout)

  // ─── Bootstrap: try silent refresh on mount ──────────────────────────────────

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      // ── Guard 1: StrictMode double-mount ──────────────────────────────────
      // React 18 mounts → unmounts → remounts in development. If the ref is
      // already populated from the first mount, skip entirely.
      if (accessTokenRef.current) {
        if (!cancelled) setIsLoading(false)
        return
      }

      // ── Guard 2: sessionStorage restore ───────────────────────────────────
      // Access token is persisted in sessionStorage so page reloads don't need
      // a network round-trip. If the stored token is still valid, hydrate from
      // storage and skip the /auth/refresh call entirely.
      const stored = ssRestore()
      if (stored) {
        if (!cancelled) {
          setTokens(stored.token, stored.user)
          setIsLoading(false)
        }
        return
      }

      // ── Fallback: silent refresh via httpOnly cookie ───────────────────────
      // No valid token in storage (first visit, expired, or tab was closed).
      // Call /auth/refresh once to get a fresh access token from the cookie.
      try {
        const token = await refreshAccessToken()
        if (!cancelled && !token) {
          // No valid session – redirect to login unless already there
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/login") &&
            !window.location.pathname.startsWith("/signup")
          ) {
            router.replace("/login")
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Cross-tab logout sync ────────────────────────────────────────────────────
  // The refresh token lives in localStorage, which is shared between tabs. If
  // one tab signs out it removes that key; without this listener the other tabs
  // would keep running on their in-memory access token until it expired.
  // The `storage` event only fires in OTHER tabs, so there is no feedback loop.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_REFRESH_KEY) return
      // Removed elsewhere → that tab logged out or its session died
      if (e.newValue === null && accessTokenRef.current) {
        clearTokens()
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login")
        ) {
          // No reason param: this is a deliberate sign-out, not an expiry
          window.location.replace("/login")
        }
      }
    }

    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [clearTokens])

  // ─── Proactive token refresh ──────────────────────────────────────────────────
  // Schedule a silent refresh 1 minute before the access token expires.
  // This keeps the session alive during inactive periods as long as the
  // refresh token is still valid (7 days) — presented via the httpOnly cookie
  // where the browser allows it, otherwise via the request body.
  // If the refresh genuinely fails, redirect to login rather than leaving the
  // user on a blank screen.
  useEffect(() => {
    if (!accessToken) return

    let timerId: ReturnType<typeof setTimeout> | null = null

    try {
      const b64     = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
      const payload = JSON.parse(atob(b64)) as { exp?: number }
      const expiresAt = (payload.exp ?? 0) * 1000
      // Refresh 1 minute before expiry (minimum 5 seconds to avoid tight loops)
      const delay = Math.max(5_000, expiresAt - Date.now() - 60_000)
      timerId = setTimeout(async () => {
        const newToken = await refreshAccessToken()
        if (!newToken) {
          // Refresh token also expired — session is dead.
          // forceLogout clears state and redirects to /login?reason=session_expired
          forceLogout("session_expired")
        }
      }, delay)
    } catch {
      // Malformed token – don't crash, let normal 401 handling take over
    }

    return () => {
      if (timerId) clearTimeout(timerId)
    }
  }, [accessToken, refreshAccessToken, forceLogout])

  // ─── Auth actions ────────────────────────────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(apiUrl("auth/login"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.status) {
        throw new Error(data.message || "Login failed")
      }

      const { accessToken: token, user: userData, refreshToken } = data.data
      // Keep the refresh token: the httpOnly cookie is third-party in
      // production and may never reach /auth/refresh (see note at top).
      refreshTokenSet(refreshToken)
      setTokens(token, userData)
      router.replace("/dashboard")
    },
    [setTokens, router],
  )

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch(apiUrl("auth/signup"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.status) {
        // Surface validation errors from the API
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.map((e: { msg: string }) => e.msg).join(". "))
        }
        throw new Error(data.message || "Sign up failed")
      }

      const { accessToken: token, user: userData, refreshToken } = data.data
      // Keep the refresh token: the httpOnly cookie is third-party in
      // production and may never reach /auth/refresh (see note at top).
      refreshTokenSet(refreshToken)
      setTokens(token, userData)
      router.replace("/dashboard")
    },
    [setTokens, router],
  )

  const logout = useCallback(async () => {
    try {
      if (accessTokenRef.current) {
        await fetch(apiUrl("auth/logout"), {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessTokenRef.current}`,
          },
        })
      }
    } catch {
      // Best-effort – clear local state regardless
    } finally {
      clearTokens()
      router.replace("/login")
    }
  }, [clearTokens, router])

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev))
  }, [])

  // ─── Context value ───────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    login,
    signup,
    logout,
    updateUser,
    getToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>")
  }
  return ctx
}

// Export the refresh function separately so apiClient can use it without
// going through the hook (which requires a React component context)
export { AuthContext }
