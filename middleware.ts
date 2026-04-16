/**
 * Next.js middleware for route protection.
 *
 * How it works:
 * - On hard navigations (full page load / direct URL), checks for the
 *   `refreshToken` cookie. If absent → redirect to /login.
 * - On client-side navigation (router.push/replace), Next.js sends an RSC
 *   fetch with the `RSC` header. We pass these through so post-login
 *   redirects work. The AuthProvider handles auth for client-side nav.
 *
 * NOTE: The refreshToken cookie MUST have path: '/' (set in the backend) so
 * the browser includes it on requests to all routes, not just /api/auth/*.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that do NOT require authentication
const PUBLIC_PATHS = ["/login", "/signup"]

// Cookie name set by the backend on login/signup/refresh
const REFRESH_TOKEN_COOKIE = "refreshToken"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Always allow public paths ──────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── 2. Always allow Next.js internals, static assets, and API routes ──────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // ── 3. Pass through RSC / client-side navigation requests ─────────────────
  // Next.js App Router identifies RSC requests in two ways:
  //   a) A `_rsc` query parameter (e.g. /?_rsc=13uu9) — most reliable signal
  //   b) HTTP headers: RSC, Next-Router-State-Tree, Next-Router-Prefetch
  // Client-side navigation (router.push/replace) always uses RSC.
  // We must pass these through so post-login redirects work.
  // The AuthProvider handles auth state for all client-side navigation.
  const isRSCRequest =
    request.nextUrl.searchParams.has("_rsc") ||
    request.headers.has("rsc") ||
    request.headers.has("next-router-state-tree") ||
    request.headers.has("next-router-prefetch")

  if (isRSCRequest) {
    return NextResponse.next()
  }

  // ── 4. Hard navigation guard ──────────────────────────────────────────────
  // For full page loads (typing a URL, F5 refresh, opening a link), enforce
  // session presence via the refresh token cookie.
  const hasSession = request.cookies.has(REFRESH_TOKEN_COOKIE)

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
