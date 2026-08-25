import { ToneBadge, type BadgeTone } from "@/components/ui/tone-badge"

type StatusBadgeProps = {
  status: "Pending" | "Paid" | "Overdue"
  className?: string
}

/**
 * Transaction payment status.
 *
 * The visual treatment now lives in ToneBadge — this is just the
 * transaction-domain vocabulary mapped onto it. Nine components import this,
 * so the API is unchanged.
 */
const TONE: Record<StatusBadgeProps["status"], BadgeTone> = {
  Paid: "success",
  Pending: "warning",
  Overdue: "destructive",
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <ToneBadge tone={TONE[status]} className={className}>
      {status}
    </ToneBadge>
  )
}
