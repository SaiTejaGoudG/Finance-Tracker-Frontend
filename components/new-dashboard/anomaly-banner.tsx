"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import type { OverviewFilters } from "./use-overview-data"

interface Anomaly {
  category: string
  month: string
  amount: number
  average: number
  ratio: number
  severity: "high" | "medium" | "low"
}

interface AnomalyBannerProps {
  filters: OverviewFilters
  className?: string
}

const severityStyle = {
  high:   "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30",
  medium: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
  low:    "border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/30",
}

const severityIcon = {
  high:   "text-red-500",
  medium: "text-amber-500",
  low:    "text-yellow-500",
}

function fmtINR(v: number) {
  return `₹${v.toLocaleString("en-IN")}`
}

export default function AnomalyBanner({ filters, className }: AnomalyBannerProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded]   = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      startDate: filters.startDate,
      endDate:   filters.endDate,
      ...(filters.ownerType ? { owner_type: filters.ownerType } : {}),
    })
    apiClient(apiUrl("analytics/anomalies", params))
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setAnomalies(json.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters.startDate, filters.endDate, filters.ownerType])

  const visible = anomalies.filter((a) => !dismissed.has(`${a.category}-${a.month}`))

  if (loading) return (
    <p className="text-sm text-muted-foreground">Analysing spending patterns…</p>
  )

  if (visible.length === 0) return (
    <p className="text-sm text-muted-foreground">No spending spikes detected in this period. 🎉</p>
  )

  const shown = expanded ? visible : visible.slice(0, 2)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{visible.length} spike{visible.length !== 1 ? "s" : ""} found</p>
        {visible.length > 2 && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show all</>}
          </button>
        )}
      </div>

      {shown.map((a) => {
        const key = `${a.category}-${a.month}`
        return (
          <div
            key={key}
            className={cn(
              "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
              severityStyle[a.severity],
            )}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className={cn("h-4 w-4 shrink-0 mt-0.5", severityIcon[a.severity])} />
              <div>
                <span className="font-semibold">{a.category}</span>
                <span className="text-muted-foreground"> in </span>
                <span className="font-semibold">{a.month}</span>
                <span className="text-muted-foreground"> was </span>
                <span className="font-semibold">{fmtINR(a.amount)}</span>
                <span className="text-muted-foreground"> — </span>
                <span className="font-medium text-foreground">{a.ratio}× your average of {fmtINR(a.average)}</span>
              </div>
            </div>
            <button
              onClick={() => setDismissed((p) => new Set([...p, key]))}
              className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
