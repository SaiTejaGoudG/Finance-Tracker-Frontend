import type * as React from "react"
import { cn } from "@/lib/utils"

/**
 * The single KPI / stat tile.
 *
 * This pattern was implemented five separate times — `Kpi` (lending-tab),
 * `KpiTile` (loans-tab), `SummaryTile` (business-tab), `StatCard`
 * (new-dashboard/summary-cards) and `StatPill` (freelancing-analytics) —
 * plus four more inline in dashboard.tsx.
 *
 * Only THREE of those were true duplicates — Kpi, KpiTile and SummaryTile —
 * and this replaces those. They agreed on the container (`rounded-2xl border
 * bg-card shadow-sm`) but had drifted on everything else: the label was
 * 10px / 12px / 12px-medium depending on the file, the value was text-xl or
 * text-2xl, tone was a union in two of them and a raw `valueClass` string in
 * the third, and one used `tabular-nums` while the others used `.tnum`.
 *
 * StatCard (animated counter + trend) and StatPill (horizontal, icon square)
 * are deliberately NOT folded in — they're different patterns, not copies,
 * and collapsing them here would be a visual regression.
 *
 * One component, one set of choices:
 *   - label  text-2xs uppercase tracking-wider muted
 *   - value  text-xl (text-2xl when `emphasis`), bold, .tnum
 *   - tone   semantic union, so it inverts correctly in dark mode
 *
 * `tone` is deliberately a closed union rather than a className passthrough:
 * the loans version accepted an arbitrary string, which is how raw palette
 * colours (that don't invert in dark mode) got in.
 */

export type StatTone = "neutral" | "success" | "destructive" | "info" | "warning"

const TONE_CLASS: Record<StatTone, string> = {
  neutral: "text-foreground",
  success: "text-success-text",
  destructive: "text-destructive-text",
  info: "text-info-text",
  warning: "text-warning-text",
}

export interface StatTileProps {
  label: string
  /** Pre-formatted — the tile doesn't know about currency or locale. */
  value: React.ReactNode
  /** Secondary line under the value, e.g. "3 active" or "since 12 Aug". */
  sub?: React.ReactNode
  tone?: StatTone
  /** Small icon beside the label. */
  icon?: React.ElementType
  /** Larger value + a subtle ring, for the one tile that leads the group. */
  emphasis?: boolean
  /** Makes the whole tile activatable. Adds hover affordance + keyboard support. */
  onClick?: () => void
  className?: string
}

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
  icon: Icon,
  emphasis = false,
  onClick,
  className,
}: StatTileProps) {
  const interactive = typeof onClick === "function"

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        emphasis && "ring-1 ring-primary/20",
        interactive &&
          "cursor-pointer transition-colors hover:border-foreground/20 hover:bg-accent/20",
        className,
      )}
      {...(interactive
        ? {
            role: "button",
            tabIndex: 0,
            onClick,
            // A div with onClick is invisible to keyboard users; mirror the
            // Enter/Space behaviour a real button would have.
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick()
              }
            },
          }
        : {})}
    >
      <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        <span className="truncate">{label}</span>
      </div>

      <p className={cn("tnum mt-1 font-bold", emphasis ? "text-2xl" : "text-xl", TONE_CLASS[tone])}>
        {value}
      </p>

      {sub && <p className="mt-0.5 text-2xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default StatTile
