"use client"

import { useState } from "react"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { FileText, Sparkles, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { SkeletonText } from "@/components/ui/states"
import type { OverviewFilters } from "./use-overview-data"

interface MonthSummaryCardProps { filters: OverviewFilters; className?: string }

export default function MonthSummaryCard({ filters, className }: MonthSummaryCardProps) {
  const [summary, setSummary]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [month, setMonth]       = useState(format(subMonths(new Date(), 1), "yyyy-MM"))
  const [open, setOpen]         = useState(false)

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i + 1)
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") }
  })

  const generate = async () => {
    setLoading(true)
    setSummary(null)
    try {
      const d = new Date(month + "-01")
      const res = await apiClient(apiUrl("ai/month-summary"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate:  format(startOfMonth(d), "yyyy-MM-dd"),
          endDate:    format(endOfMonth(d), "yyyy-MM-dd"),
          owner_type: filters.ownerType || undefined,
          month:      format(d, "MMMM yyyy"),
        }),
      })
      const json = await res.json()
      if (json.status === "success") setSummary(json.data.summary)
    } catch {} finally { setLoading(false) }
  }

  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm p-5 space-y-4", className)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-warning-subtle">
          <FileText className="h-4 w-4 text-warning-subtle-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Month-close Summary</h3>
          <p className="text-xs text-muted-foreground">AI-generated end-of-month report</p>
        </div>
      </div>

      {/* Month picker */}
      <div className="relative">
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex items-center justify-between w-full rounded-xl border bg-muted/40 px-3 py-2 text-sm"
        >
          <span>{months.find((m) => m.value === month)?.label}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        {open && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border bg-background shadow-lg py-1">
            {months.map((m) => (
              <button
                key={m.value}
                onClick={() => { setMonth(m.value); setOpen(false); setSummary(null) }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                  month === m.value && "font-medium text-info-text"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground text-sm font-medium py-2.5 transition-colors disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" />
        {loading ? "Generating…" : "Generate Summary"}
      </button>

      {loading && <SkeletonText lines={4} />}

      {summary && (
        <div className="rounded-xl bg-warning-subtle border border-warning/25 p-4">
          <p className="text-sm text-warning-subtle-foreground leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  )
}
