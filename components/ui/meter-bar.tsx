import { cn } from "@/lib/utils"

/**
 * A thin horizontal progress/utilization bar.
 *
 * Hand-rolled in ~11 places as `<div class="h-1.5 w-full overflow-hidden
 * rounded-full bg-muted"><div style={{width:'X%'}}/></div>`, with the height
 * varying between h-1.5 and h-2 depending on the file, and the fill colour
 * sometimes a semantic token and sometimes a raw hex. (Distinct from
 * components/ui/progress.tsx, the Radix primitive, which only three screens
 * use — this is the lightweight inline variant everything else reached for.)
 *
 * `value` is clamped, because a couple of call sites compute a percentage
 * that can exceed 100 (an over-budget category, a card past its limit) and
 * an unclamped width overflows its container.
 */

export type MeterTone = "primary" | "success" | "warning" | "destructive" | "info"

const TONE_CLASS: Record<MeterTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
}

export function MeterBar({
  value,
  tone = "primary",
  /** Explicit fill colour, for per-card/per-category colours. Overrides `tone`. */
  color,
  fillClassName,
  size = "sm",
  className,
  "aria-label": ariaLabel,
}: {
  /** Percentage 0–100. Values outside are clamped. */
  value: number
  tone?: MeterTone
  color?: string
  /**
   * Escape hatch for a fill class computed at runtime — e.g. the credit-card
   * page's `utilizationTone(pct)`, which returns bg-success / bg-warning /
   * bg-destructive depending on how close to the limit the card is, so it
   * can't be a static `tone`. Keep these to SEMANTIC token classes; raw
   * palette classes won't invert in dark mode.
   */
  fillClassName?: string
  size?: "sm" | "md"
  className?: string
  "aria-label"?: string
}) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-muted",
        size === "md" ? "h-2" : "h-1.5",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          fillClassName ?? (!color && TONE_CLASS[tone]),
        )}
        style={{ width: `${pct}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  )
}

export default MeterBar
