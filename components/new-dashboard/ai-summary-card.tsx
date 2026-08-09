"use client"

import { useEffect, useState, useCallback } from "react"
import { Sparkles, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { ErrorBanner, SkeletonText } from "@/components/ui/states"
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
      "rounded-2xl border border-info/25 bg-info-subtle shadow-sm p-5",
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-info/15 shrink-0">
            <Sparkles className="h-4 w-4 text-info-subtle-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-info-subtle-foreground uppercase tracking-wider">AI Insight</p>
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
          <SkeletonText lines={3} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={fetchSummary} />
        ) : summary ? (
          <p className="text-sm text-info-subtle-foreground leading-relaxed">{summary}</p>
        ) : null}
      </div>
    </div>
  )
}
