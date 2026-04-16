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
    ssClear()                // evict from sessionStorage
    sessionCookieClear()     // remove session flag so middleware redirects to login
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
        const res = await fetch(apiUrl("auth/refresh"), {
          method: "POST",
          credentials: "include", // send httpOnly refresh token cookie
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) {
          clearTokens()
          return null
        }

        const data = await res.json()
        if (data.status && data.data?.accessToken) {
          const { accessToken: newToken, user: userData } = data.data
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

  // Register token handlers SYNCHRONOUSLY in the render body (not useEffect).
  // React runs child effects BEFORE parent effects, so if this were a useEffect,
  // child components (e.g. Dashboard) would fire their fetch before _getToken is
  // registered → 401 on every first request. Calling it here runs before any
  // child effect executes. getToken and refreshAccessToken are stable references.
  registerAuthHandlers(getToken, refreshAccessToken)

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

      const { accessToken: token, user: userData } = data.data
      setTokens(token, userData)
      router.replace("/")
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

      const { accessToken: token, user: userData } = data.data
      setTokens(token, userData)
      router.replace("/")
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
