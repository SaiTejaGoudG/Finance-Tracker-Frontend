"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { Users } from "lucide-react"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import type { OverviewFilters } from "../use-overview-data"

const OWNER_COLORS = ["#6366f1","#10b981","#f59e0b","#f43f5e"]
const fmtINR = (v: number) => `₹${v.toLocaleString("en-IN")}`
const fmtY   = (v: number) => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-background/95 shadow-lg p-3 text-xs min-w-[160px] space-y-1.5">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums">{fmtINR(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function OwnerComparison({ filters }: { filters: OverviewFilters }) {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState<"income" | "expense">("income")

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate })
    apiClient(apiUrl("analytics/owner-comparison", p)).then(r => r.json()).then(j => { if (j.status === "success") setData(j.data) }).catch(() => {}).finally(() => setLoading(false))
  }, [filters.startDate, filters.endDate])

  if (loading) return <div className="h-64 bg-muted animate-pulse rounded-2xl" />
  if (!data || data.owners.length === 0) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Users className="h-8 w-8 opacity-30 mr-2" /><span>No multi-owner data found</span>
    </div>
  )

  const owners: any[] = data.owners
  const activeOwners: string[] = data.activeOwners

  // Summary cards per owner
  return (
    <div className="space-y-5">
      {/* Per-owner summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {owners.map((o: any, i: number) => (
          <div key={o.owner} className="rounded-2xl border bg-card shadow-sm p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: OWNER_COLORS[i % OWNER_COLORS.length] }} />
              <p className="text-sm font-semibold capitalize">{o.owner}</p>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Income</span><span className="font-medium text-emerald-600">{fmtINR(o.income)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Expense</span><span className="font-medium text-rose-500">{fmtINR(o.expense)}</span></div>
              <div className="flex justify-between border-t pt-1 mt-1"><span className="text-muted-foreground">Balance</span><span className={`font-bold ${o.balance >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{fmtINR(o.balance)}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly comparison chart */}
      <div className="rounded-2xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Monthly Comparison</h3>
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            {(["income","expense"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${view === v ? "bg-black text-white dark:bg-white dark:text-black" : "text-muted-foreground hover:text-foreground"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {activeOwners.map((o, i) => (
                <Bar key={o} dataKey={`${o}_${view}`} name={o} fill={OWNER_COLORS[i % OWNER_COLORS.length]} radius={[2,2,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
