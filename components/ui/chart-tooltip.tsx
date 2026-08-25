import type * as React from "react"
import { cn } from "@/lib/utils"

/**
 * The shared shell for recharts tooltips.
 *
 * Twelve chart components each declared their own `CustomTooltip` /
 * `ChartTooltip` / `*Tooltip`. The CONTENT legitimately differs per chart
 * (some show one series, some show four, some add a count or a percentage),
 * but the shell had drifted for no reason — seven different container class
 * strings varying only in whether they had `backdrop-blur-sm` and whether
 * `min-w` was 140px, 160px or 180px, plus one outlier using `bg-popover`
 * with a different radius and shadow.
 *
 * So only the shell is shared: a card and a labelled row. Each chart still
 * writes its own tooltip function and decides what goes in it — this just
 * stops them looking like they came from different apps.
 *
 * Usage:
 *   function MyTooltip({ active, payload, label }: any) {
 *     if (!active || !payload?.length) return null
 *     return (
 *       <ChartTooltipCard title={label}>
 *         {payload.map((p: any) => (
 *           <ChartTooltipRow key={p.name} label={p.name} color={p.color}
 *             value={fmt(p.value)} />
 *         ))}
 *       </ChartTooltipCard>
 *     )
 *   }
 */

export function ChartTooltipCard({
  title,
  children,
  className,
}: {
  title?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "min-w-[160px] space-y-1.5 rounded-xl border bg-background/95 p-3 text-xs shadow-lg backdrop-blur-sm",
        className,
      )}
    >
      {title != null && <p className="mb-2 font-semibold text-foreground">{title}</p>}
      {children}
    </div>
  )
}

export function ChartTooltipRow({
  label,
  value,
  /** Series colour — rendered as the dot, matching the line/bar it describes. */
  color,
}: {
  label: React.ReactNode
  value: React.ReactNode
  color?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {color && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        )}
        {label}
      </span>
      <span className="tnum font-medium">{value}</span>
    </div>
  )
}
