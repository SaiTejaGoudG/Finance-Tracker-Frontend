"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from "recharts"
import { ShoppingBag } from "lucide-react"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import type { OverviewFilters } from "../use-overview-data"

const COLORS = [
  "hsl(var(--chart-1))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))",
  "hsl(var(--chart-5))","hsl(var(--chart-6))","hsl(var(--chart-7))","hsl(var(--chart-8))",
  "hsl(var(--chart-1))","hsl(var(--chart-2))",
]
const fmtINR = (v: number) => `₹${v.toLocaleString("en-IN")}`
const fmtY   = (v: number) => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`

function FixedVariableTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-md p-2.5 text-xs space-y-1">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
            {p.dataKey === "fixed" ? "Fixed" : "Variable"}
          </span>
          <span className="font-medium tabular-nums">{fmtINR(p.value as number)}</span>
        </div>
      ))}
    </div>
  )
}

function ExpenseTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-md p-2.5 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Expenses</span>
        <span className="font-medium tabular-nums">{fmtINR(payload[0].value as number)}</span>
      </div>
    </div>
  )
}

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
          { label: "Total Expenses",   value: fmtINR(data.total),           color: "text-destructive-text" },
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

      {/* Fixed vs Variable summary */}
      {(data.totalFixed > 0 || data.totalVariable > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Fixed Expenses</p>
            <p className="text-xl font-bold tabular-nums mt-1 text-info-text">{fmtINR(data.totalFixed)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.total > 0 ? ((data.totalFixed / data.total) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Variable Expenses</p>
            <p className="text-xl font-bold tabular-nums mt-1 text-warning-text">{fmtINR(data.totalVariable)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.total > 0 ? ((data.totalVariable / data.total) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
        </div>
      )}

      {/* Fixed vs Variable monthly bar chart */}
      {data.fixedVsVariable && data.fixedVsVariable.some((m: any) => m.fixed > 0 || m.variable > 0) && (
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Fixed vs Variable — Monthly Comparison</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.fixedVsVariable} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<FixedVariableTooltip />} />
                <Legend formatter={(v: string) => v === "fixed" ? "Fixed" : "Variable"} />
                <Bar dataKey="fixed"    fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="variable" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly trend */}
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Monthly Expenses</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<ExpenseTooltip />} />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#gradExp)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
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
