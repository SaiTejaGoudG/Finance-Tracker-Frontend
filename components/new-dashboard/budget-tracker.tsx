"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Trash2, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import type { OverviewFilters } from "./use-overview-data"

interface BudgetRow {
  id: number
  category: string
  monthly_limit: number
  actual: number
  remaining: number
  percentage: number
  status: "ok" | "warning" | "over"
}

const statusStyle = {
  ok:      { bar: "bg-emerald-500", icon: CheckCircle,    text: "text-emerald-600" },
  warning: { bar: "bg-amber-500",   icon: AlertTriangle,  text: "text-amber-600" },
  over:    { bar: "bg-red-500",     icon: AlertCircle,    text: "text-red-500" },
}

interface BudgetTrackerProps { filters: OverviewFilters; className?: string }

export default function BudgetTracker({ filters, className }: BudgetTrackerProps) {
  const [vsActual, setVsActual]     = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [adding, setAdding]         = useState(false)
  const [newCat, setNewCat]         = useState("")
  const [newLimit, setNewLimit]     = useState("")
  const [saving, setSaving]         = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams(filters.ownerType ? { owner_type: filters.ownerType } : {})
    apiClient(apiUrl("budget/vs-actual", params))
      .then((r) => r.json())
      .then((j) => { if (j.status === "success") setVsActual(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters.ownerType])

  useEffect(() => { refresh() }, [refresh])

  const saveBudget = async () => {
    if (!newCat.trim() || !newLimit) return
    setSaving(true)
    try {
      await apiClient(apiUrl("budget/upsert"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCat.trim(), monthly_limit: parseFloat(newLimit) }),
      })
      setNewCat("")
      setNewLimit("")
      setAdding(false)
      refresh()
    } catch {} finally { setSaving(false) }
  }

  const deleteBudget = async (category: string) => {
    const params = new URLSearchParams({ category })
    await apiClient(apiUrl("budget/delete", params), { method: "DELETE" })
    refresh()
  }

  const budgets: BudgetRow[] = vsActual?.budgets ?? []

  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      <div className="px-5 pt-5 pb-4 flex items-start justify-between border-b">
        <div>
          <h3 className="text-sm font-semibold">Budget vs Actual</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{vsActual?.month ?? "This month"}</p>
        </div>
        {vsActual && (
          <div className="text-right text-xs text-muted-foreground">
            <p>Spent <span className="font-semibold text-foreground">₹{vsActual.totalActual.toLocaleString("en-IN")}</span></p>
            <p>of <span className="font-semibold">₹{vsActual.totalLimit.toLocaleString("en-IN")}</span> budget</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-5 space-y-4">
          {[1,2,3].map(i => <div key={i} className="space-y-1.5">
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            <div className="h-2 w-full bg-muted animate-pulse rounded-full" />
          </div>)}
        </div>
      ) : (
        <div className="divide-y">
          {budgets.length === 0 && !adding && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No budgets set. Add one to start tracking.
            </div>
          )}

          {budgets.map((b) => {
            const style = statusStyle[b.status]
            const Icon  = style.icon
            const pct   = Math.min(b.percentage, 100)
            return (
              <div key={b.id} className="px-5 py-3.5 space-y-2 group hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", style.text)} />
                    <span className="text-sm font-medium">{b.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums">
                      <span className="font-bold">₹{b.actual.toLocaleString("en-IN")}</span>
                      <span className="text-muted-foreground"> / ₹{b.monthly_limit.toLocaleString("en-IN")}</span>
                    </span>
                    <button
                      onClick={() => deleteBudget(b.category)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", style.bar)} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{b.percentage}% used</span>
                  <span>{b.remaining >= 0 ? `₹${b.remaining.toLocaleString("en-IN")} left` : `₹${Math.abs(b.remaining).toLocaleString("en-IN")} over`}</span>
                </div>
              </div>
            )
          })}

          {/* Add new */}
          {adding ? (
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Category (e.g. Shopping)"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="text-sm rounded-lg border bg-muted/40 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                <input
                  type="number"
                  placeholder="Monthly limit (₹)"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  className="text-sm rounded-lg border bg-muted/40 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveBudget} disabled={saving} className="flex-1">
                  {saving ? "Saving…" : "Save Budget"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewCat(""); setNewLimit("") }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-3">
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Add budget
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
