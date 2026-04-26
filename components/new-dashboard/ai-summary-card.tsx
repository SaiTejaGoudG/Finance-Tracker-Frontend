"use client"

import { useEffect, useState, useCallback } from "react"
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import type { OverviewFilters } from "./use-overview-data"

interface AISummaryCardProps {
  filters: OverviewFilters
  className?: string
}

export default function AISummaryCard({ filters, className }: AISummaryCardProps) {
  const [summary, setSummary]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [fetched, setFetched]   = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient(apiUrl("ai/summary"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate:  filters.startDate,
          endDate:    filters.endDate,
          owner_type: filters.ownerType || undefined,
        }),
      })
      const json = await res.json()
      if (json.status !== "success") throw new Error(json.message)
      setSummary(json.data.summary)
      setFetched(true)
    } catch (e: any) {
      setError(e.message || "Failed to generate summary")
    } finally {
      setLoading(false)
    }
  }, [filters.startDate, filters.endDate, filters.ownerType])

  // Auto-fetch on mount
  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return (
    <div className={cn(
      "rounded-2xl border bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 shadow-sm p-5",
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/50 shrink-0">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider">AI Insight</p>
          </div>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh summary"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="space-y-2">
            {[100, 85, 70].map((w, i) => (
              <div key={i} className="h-3 rounded-full bg-violet-200/60 dark:bg-violet-800/40 animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : summary ? (
          <p className="text-sm text-foreground/90 leading-relaxed">{summary}</p>
        ) : null}
      </div>
    </div>
  )
}
