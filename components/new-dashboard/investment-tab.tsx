"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { PiggyBank } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import type { OverviewFilters } from "./use-overview-data"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-md p-2.5 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Invested</span>
        <span className="font-medium tabular-nums">
          ₹{(payload[0].value as number).toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  )
}

function fmtY(v: number) {
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`
  if (v >= 1_000)   return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${v}`
}

interface InvestmentTabProps { filters: OverviewFilters; className?: string }

export default function InvestmentTab({ filters, className }: InvestmentTabProps) {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      startDate: filters.startDate, endDate: filters.endDate,
      ...(filters.ownerType ? { owner_type: filters.ownerType } : {}),
    })
    apiClient(apiUrl("analytics/investments", params))
      .then((r) => r.json())
      .then((j) => { if (j.status === "success") setData(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters.startDate, filters.endDate, filters.ownerType])

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
    </div>
  )

  if (!data || data.total === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <PiggyBank className="h-10 w-10 opacity-30" />
      <p className="text-sm">No investment data for this period</p>
    </div>
  )

  return (
    <div className={cn("space-y-5", className)}>
      {/* Summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Invested",    value: `₹${data.total.toLocaleString("en-IN")}`,            color: "text-info-text" },
          { label: "Active Months",     value: `${data.activeMonths}`,                               color: "text-foreground" },
          { label: "Avg / Active Month",value: `₹${data.avgPerMonth.toLocaleString("en-IN")}`,       color: "text-success-text" },
          { label: "Transactions",      value: `${data.txnCount}`,                                   color: "text-foreground" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={cn("text-xl font-bold tabular-nums mt-1", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly trend */}
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Monthly Investment</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#gradInv)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By category */}
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">By Category</h3>
          <div className="space-y-3">
            {data.byCategory.map((cat: any, idx: number) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="font-medium">{cat.category}</span>
                  </span>
                  <span className="tabular-nums font-bold">₹{cat.amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
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
