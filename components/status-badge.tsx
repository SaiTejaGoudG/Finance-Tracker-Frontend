import { cn } from "@/lib/utils"

type StatusBadgeProps = {
  status: "Pending" | "Paid" | "Overdue"
  className?: string
}

/**
 * Status pill. Uses the semantic *-subtle token pair so it inverts correctly
 * in dark mode (the previous bg-yellow-100/bg-green-100 had no dark variant).
 */
/**
 * The border matters on dark backgrounds: without it the tinted fill sits only
 * a few percent above the card and the chip loses its edge.
 */
const STYLES: Record<StatusBadgeProps["status"], string> = {
  Paid: "bg-success-subtle text-success-subtle-foreground border border-success/30",
  Pending: "bg-warning-subtle text-warning-subtle-foreground border border-warning/30",
  Overdue:
    "bg-destructive-subtle text-destructive-subtle-foreground border border-destructive/30",
}

const DOT: Record<StatusBadgeProps["status"], string> = {
  Paid: "bg-success",
  Pending: "bg-warning",
  Overdue: "bg-destructive",
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[status])}
        aria-hidden="true"
      />
      {status}
    </span>
  )
}
