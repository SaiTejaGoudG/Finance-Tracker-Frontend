"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { ShoppingBag } from "lucide-react"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import type { OverviewFilters } from "../use-overview-data"

const COLORS = ["#f43f5e","#f97316","#f59e0b","#eab308","#84cc16","#10b981","#06b6d4","#6366f1","#8b5cf6","#ec4899"]
const fmtINR = (v: number) => `₹${v.toLocaleString("en-IN")}`
const fmtY   = (v: number) => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`

export default function ExpensesAnalytics({ filters }: { filters: OverviewFilters }) {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate, ...(filters.ownerType ? { owner_type: filters.ownerType } : {}) })
    apiClient(apiUrl("analytics/expenses", p)).then(r => r.json()).then(j => { if (j.status === "success") setData(j.data) }).catch(() => {}).finally(() => setLoading(false))
  }, [filters.startDate, filters.endDate, filters.ownerType])

  if (loading) return <div className="h-64 bg-muted animate-pulse rounded-2xl" />
  if (!data || data.total === 0) return <div className="flex items-center justify-center py-20 text-muted-foreground"><ShoppingBag className="h-8 w-8 opacity-30 mr-2" /><span>No expense data for this period</span></div>

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Expenses",   value: fmtINR(data.total),           color: "text-rose-600" },
          { label: "Avg / Month",      value: fmtINR(data.avgPerMonth),      color: "text-foreground" },
          { label: "Highest Month",    value: data.highestMonth.label,       color: "text-foreground" },
          { label: "Transactions",     value: `${data.txnCount}`,            color: "text-foreground" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
            {s.label === "Highest Month" && <p className="text-xs text-muted-foreground mt-0.5">{fmtINR(data.highestMonth.amount)}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly trend */}
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Monthly Expenses</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip formatter={(v: any) => [fmtINR(v), "Expenses"]} />
                <Area type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={2} fill="url(#gradExp)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By category */}
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">By Category</h3>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {data.byCategory.map((cat: any, i: number) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-medium truncate">{cat.category}</span>
                  </span>
                  <span className="tabular-nums font-bold shrink-0 ml-2">{fmtINR(cat.amount)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
                <p className="text-xs text-muted-foreground text-right">{cat.percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
