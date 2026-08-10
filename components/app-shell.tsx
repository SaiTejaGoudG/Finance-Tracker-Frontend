"use client"

/**
 * AppShell — the single wrapper every authenticated route uses.
 *
 * Handles the auth gate, chrome (sidebar + header), the filters provider, the
 * page title block, and the optional date-range bar. Route files end up being
 * little more than "here is my heading and here is my content".
 */

import type React from "react"
import { useAuth } from "@/context/AuthContext"
import { FiltersProvider, useFilters } from "@/context/FiltersContext"
import LayoutWrapper from "@/components/layout-wrapper"
import DateRangeFilter from "@/components/new-dashboard/date-range-filter"
import { CenteredSpinner } from "@/components/ui/states"
import { cn } from "@/lib/utils"

// ─── Filter bar (needs to be inside the provider) ─────────────────────────────

/**
 * Exported so a page that needs to own its header — because the header's
 * actions depend on data the page already fetches — can lay out
 * PageHeader / FilterBar / content itself and avoid a duplicate request.
 */
export function FilterBar() {
  const { filters, setFilters } = useFilters()
  return <DateRangeFilter filters={filters} onChange={setFilters} />
}

// ─── Page header ──────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ─── Section panel ────────────────────────────────────────────────────────────

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: React.ReactNode
  /** Page title. Omit to render no header (e.g. a route with its own). */
  title?: string
  description?: string
  actions?: React.ReactNode
  /** Show the shared date-range / owner filter bar. */
  showFilters?: boolean
  /** Slot between the filter bar and the content — used for sub-navigation. */
  subNav?: React.ReactNode
}

export default function AppShell({
  children,
  title,
  description,
  actions,
  showFilters = false,
  subNav,
}: AppShellProps) {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CenteredSpinner label="Loading…" />
      </div>
    )
  }

  // AuthContext redirects to /login; render nothing rather than flashing chrome
  if (!isAuthenticated) return null

  return (
    <LayoutWrapper>
      <FiltersProvider>
        <div className="w-full space-y-5 3xl:mx-auto 3xl:max-w-7xl">
          {title && (
            <PageHeader title={title} description={description} actions={actions} />
          )}
          {showFilters && <FilterBar />}
          {subNav}
          {children}
        </div>
      </FiltersProvider>
    </LayoutWrapper>
  )
}
