"use client"

import { useEffect, useState, useCallback } from "react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts"
import { ChevronDown } from "lucide-react"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import type { OverviewFilters } from "../use-overview-data"

const fmtINR = (v: number) => `₹${v.toLocaleString("en-IN")}`
const fmtY   = (v: number) => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`

export default function CategoryTrends({ filters }: { filters: OverviewFilters }) {
  const [data, setData]           = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [category, setCategory]   = useState<string>("")
  const [categories, setCategories] = useState<string[]>([])
  const [dropOpen, setDropOpen]   = useState(false)

  const fetch = useCallback((cat?: string) => {
    setLoading(true)
    const p = new URLSearchParams({
      startDate: filters.startDate,
      endDate:   filters.endDate,
      ...(filters.ownerType ? { owner_type: filters.ownerType } : {}),
      ...(cat ? { category: cat } : {}),
    })
    apiClient(apiUrl("analytics/category-trend", p))
      .then(r => r.json())
      .then(j => {
        if (j.status === "success") {
          setData(j.data)
          setCategories(j.data.categories || [])
          if (!cat && j.data.category) setCategory(j.data.category)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters.startDate, filters.endDate, filters.ownerType])

  useEffect(() => { fetch() }, [fetch])

  const selectCategory = (cat: string) => {
    setCategory(cat)
    setDropOpen(false)
    fetch(cat)
  }

  if (loading && !data) return <div className="h-64 bg-muted animate-pulse rounded-2xl" />
  if (!data) return null

  const avgLine = data.avgPerMonth

  return (
    <div className="space-y-5">
      {/* Category picker */}
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium text-muted-foreground shrink-0">Category:</p>
        <div className="relative">
          <button
            onClick={() => setDropOpen(p => !p)}
            className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent transition-colors min-w-[160px] justify-between"
          >
            <span>{category || "Select…"}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {dropOpen && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border bg-background shadow-xl py-1 max-h-60 overflow-y-auto">
              {categories.map(cat => (
                <button key={cat} onClick={() => selectCategory(cat)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${cat === category ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.total === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          No transactions found for &quot;{category}&quot; in this period
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Total",          value: fmtINR(data.total),       color: "text-indigo-600" },
              { label: "Avg / Month",    value: fmtINR(data.avgPerMonth), color: "text-foreground" },
              { label: "Transactions",   value: `${data.txnCount}`,       color: "text-foreground" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`text-xl font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Bar chart with avg reference line */}
          <div className="rounded-2xl border bg-card shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Month-by-Month: {category}</h3>
              <span className="text-xs text-muted-foreground">Dashed line = average {fmtINR(avgLine)}/month</span>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                  barSize={data.monthlyTrend.length > 8 ? 16 : 24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip
                    formatter={(v: any, _: any, p: any) => [fmtINR(v), category]}
                    labelFormatter={l => l}
                  />
                  <ReferenceLine y={avgLine} stroke="#6366f1" strokeDasharray="6 3" strokeWidth={1.5} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4,4,0,0]}
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
