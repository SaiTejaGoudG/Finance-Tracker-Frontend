import type * as React from "react"
import { cn } from "@/lib/utils"

/**
 * A semantic status pill.
 *
 * Six screens had their own status badge — `StatusBadge` (shared, 9 users),
 * `LoanStatusBadge` + `EmiStatusBadge` (loans), `getStatusBadge` (goals and
 * savings, separately) and `getPriorityBadge` (goals). They were NOT six
 * copies of one badge: each has its own vocabulary (Active/Closed/Foreclosed
 * vs Active/Matured/Closed vs High/Medium/Low), so collapsing them into one
 * fixed status union would have been wrong.
 *
 * What they *did* share is a visual language — the semantic `-subtle` token
 * pair — and that had drifted: the shared one draws a coloured dot and a
 * border, the five local ones drew neither, so the same concept looked like
 * two different components depending on which screen you were on.
 *
 * So the split is: this owns APPEARANCE (tone → colours, dot, border), each
 * domain keeps its own vocabulary and maps it to a tone. That's the part
 * that belongs to the domain and shouldn't be centralised.
 */

export type BadgeTone = "success" | "warning" | "destructive" | "info" | "neutral"

const TONE: Record<BadgeTone, { fill: string; dot: string }> = {
  success: {
    fill: "bg-success-subtle text-success-subtle-foreground border-success/30",
    dot: "bg-success",
  },
  warning: {
    fill: "bg-warning-subtle text-warning-subtle-foreground border-warning/30",
    dot: "bg-warning",
  },
  destructive: {
    fill: "bg-destructive-subtle text-destructive-subtle-foreground border-destructive/30",
    dot: "bg-destructive",
  },
  info: {
    fill: "bg-info-subtle text-info-subtle-foreground border-info/30",
    dot: "bg-info",
  },
  neutral: {
    fill: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
}

export function ToneBadge({
  tone = "neutral",
  children,
  /**
   * The dot is what makes status readable without relying on colour alone —
   * worth keeping on unless the badge is decorative.
   */
  dot = true,
  className,
}: {
  tone?: BadgeTone
  children: React.ReactNode
  dot?: boolean
  className?: string
}) {
  const t = TONE[tone]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        t.fill,
        className,
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.dot)} aria-hidden="true" />
      )}
      {children}
    </span>
  )
}

export default ToneBadge
