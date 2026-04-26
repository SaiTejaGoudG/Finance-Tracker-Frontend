"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Lock, Shuffle } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import type { OverviewFilters } from "./use-overview-data"

interface RecurringItem {
  description: string
  category: string
  transaction_type: string
  avg_amount: number
  month_count: number
  is_fixed: boolean
  last_amount: number
}

interface RecurringPanelProps { filters: OverviewFilters; className?: string }

export default function RecurringPanel({ filters, className }: RecurringPanelProps) {
  const [data, setData]         = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [showAll, setShowAll]   = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams(filters.ownerType ? { owner_type: filters.ownerType } : {})
    apiClient(apiUrl("analytics/recurring", params))
      .then((r) => r.json())
      .then((j) => { if (j.status === "success") setData(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters.ownerType])

  const items: RecurringItem[] = data?.recurring ?? []
  const shown = showAll ? items : items.slice(0, 8)

  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      <div className="px-5 pt-5 pb-4 flex items-start justify-between border-b">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            Recurring Transactions
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Detected over last 6 months — 3+ occurrences</p>
        </div>
        {data && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Est. fixed / month</p>
            <p className="text-sm font-bold text-foreground tabular-nums">
              ₹{data.totalMonthlyFixed.toLocaleString("en-IN")}
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-3">
              <div className="h-3 w-40 bg-muted animate-pulse rounded" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No recurring transactions detected yet
        </div>
      ) : (
        <div className="divide-y">
          {shown.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 gap-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
                  item.is_fixed ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-amber-100 dark:bg-amber-900/40"
                )}>
                  {item.is_fixed
                    ? <Lock className="h-3.5 w-3.5 text-emerald-600" />
                    : <Shuffle className="h-3.5 w-3.5 text-amber-600" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.description || item.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.category} · {item.month_count} months · {item.is_fixed ? "Fixed" : "Variable"}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums">₹{item.avg_amount.toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">avg/month</p>
              </div>
            </div>
          ))}

          {items.length > 8 && (
            <div className="px-5 py-3">
              <button
                onClick={() => setShowAll((p) => !p)}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                {showAll ? "Show less" : `Show all ${items.length} recurring`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
