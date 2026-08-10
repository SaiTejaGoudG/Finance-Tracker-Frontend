"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts"
import { Coins } from "lucide-react"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import type { OverviewFilters } from "../use-overview-data"

const CAT_COLORS  = [
  "hsl(var(--chart-1))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))",
  "hsl(var(--chart-5))","hsl(var(--chart-6))","hsl(var(--chart-7))","hsl(var(--chart-8))",
]
const OWN_COLORS  = ["hsl(var(--chart-1))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))"]
const fmtINR      = (v: number) => `₹${v.toLocaleString("en-IN")}`
const fmtY        = (v: number) => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`

function PettyCashTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-md p-2.5 text-xs">
      {label !== undefined && <p className="font-semibold mb-1">{label}</p>}
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Petty Cash</span>
        <span className="font-medium tabular-nums">{fmtINR(payload[0].value as number)}</span>
      </div>
    </div>
  )
}

export default function PettyCashAnalytics({ filters }: { filters: OverviewFilters }) {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate, ...(filters.ownerType ? { owner_type: filters.ownerType } : {}) })
    apiClient(apiUrl("analytics/petty-cash-detail", p)).then(r => r.json()).then(j => { if (j.status === "success") setData(j.data) }).catch(() => {}).finally(() => setLoading(false))
  }, [filters.startDate, filters.endDate, filters.ownerType])

  if (loading) return <div className="h-64 bg-muted animate-pulse rounded-2xl" />
  if (!data || data.total === 0) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Coins className="h-8 w-8 opacity-30 mr-2" /><span>No petty cash data for this period</span>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Petty Cash", value: fmtINR(data.total),       color: "text-info-text" },
          { label: "Avg / Month",      value: fmtINR(data.avgPerMonth),  color: "text-foreground" },
          { label: "Transactions",     value: `${data.txnCount}`,        color: "text-foreground" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly trend */}
      <div className="rounded-2xl border bg-card shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-3">Monthly Petty Cash</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradPC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-6))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-6))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<PettyCashTooltip />} />
              <Area type="monotone" dataKey="amount" stroke="hsl(var(--chart-6))" strokeWidth={2} fill="url(#gradPC)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By category */}
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">By Category</h3>
          <div className="space-y-3">
            {data.byCategory.map((cat: any, i: number) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                    <span className="font-medium truncate">{cat.category}</span>
                  </span>
                  <span className="tabular-nums font-bold shrink-0 ml-2">{fmtINR(cat.amount)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By owner */}
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">By Owner</h3>
          {data.byOwner.length === 0 ? (
            <p className="text-sm text-muted-foreground">No owner data</p>
          ) : (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byOwner} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtY} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="owner" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<PettyCashTooltip />} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {data.byOwner.map((_: any, i: number) => (
                      <rect key={i} fill={OWN_COLORS[i % OWN_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
