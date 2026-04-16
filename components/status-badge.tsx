import { cn } from "@/lib/utils"

type StatusBadgeProps = {
  status: "Pending" | "Paid"
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
        status === "Pending"
          ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
          : "bg-green-100 text-green-800 border border-green-200",
        className,
      )}
    >
      {status}
    </span>
  )
}
