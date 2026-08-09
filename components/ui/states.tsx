"use client"

/**
 * Shared state primitives — the ONE convention for loading, empty, and error.
 *
 * Before this existed the codebase had two competing loading idioms
 * (<Skeleton> vs hand-rolled animate-pulse divs, sometimes in the same file)
 * and every empty state was ad-hoc inline markup. Use these instead.
 *
 *   <SkeletonBlock />      one shimmering bar
 *   <SkeletonText lines /> a paragraph of bars
 *   <SkeletonRows />       table-shaped placeholder
 *   <EmptyState />         no data, with optional CTA
 *   <ErrorState />         request failed, with retry
 *   <InlineSpinner />      in-button / in-row activity
 */

import type React from "react"
import { AlertCircle, Inbox, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// ─── Skeletons ────────────────────────────────────────────────────────────────

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  )
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  // Last line is short so it reads as prose rather than a block
  const widths = ["w-full", "w-11/12", "w-4/5", "w-3/5"]
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/5" : widths[i % widths.length])}
        />
      ))}
    </div>
  )
}

/**
 * Table-shaped skeleton. Mirrors the real row height (h-[52px] content box)
 * so there's no layout shift when data lands.
 */
export function SkeletonRows({
  rows = 8,
  columns = 5,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={cn("divide-y divide-border", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          <SkeletonBlock className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3 w-40" />
            <SkeletonBlock className="h-2.5 w-24" />
          </div>
          {Array.from({ length: Math.max(0, columns - 2) }).map((_, c) => (
            <SkeletonBlock key={c} className="h-3 w-20 shrink-0" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function InlineSpinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("h-4 w-4 animate-spin", className)}
      aria-hidden="true"
    />
  )
}

export function CenteredSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[240px] flex-col items-center justify-center gap-3"
    >
      <InlineSpinner className="h-5 w-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in",
        compact ? "gap-2 py-10" : "gap-3 py-16",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-muted",
          compact ? "h-9 w-9" : "h-11 w-11",
        )}
      >
        <Icon
          className={cn("text-muted-foreground", compact ? "h-4 w-4" : "h-5 w-5")}
          aria-hidden="true"
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
  compact = false,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
  compact?: boolean
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center animate-fade-in",
        compact ? "py-10" : "py-16",
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive-subtle">
        <AlertCircle
          className="h-5 w-5 text-destructive-subtle-foreground"
          aria-hidden="true"
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  )
}

/**
 * Compact inline error for cards/panels where a full state block is too tall.
 */
export function ErrorBanner({
  message,
  onRetry,
  className,
}: {
  message: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive-subtle px-4 py-3",
        className,
      )}
    >
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-destructive-subtle-foreground"
        aria-hidden="true"
      />
      <p className="flex-1 text-sm text-destructive-subtle-foreground">{message}</p>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="-my-1 h-7 shrink-0 text-destructive-subtle-foreground hover:bg-destructive/10"
        >
          Retry
        </Button>
      )}
    </div>
  )
}
