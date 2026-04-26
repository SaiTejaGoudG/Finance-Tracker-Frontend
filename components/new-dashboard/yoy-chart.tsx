"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import type { OverviewFilters } from "./use-overview-data"

function fmtY(v: number) {
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`
  if (v >= 1_000)   return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${v}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-background/95 shadow-lg p-3 text-xs space-y-1.5 min-w-[180px]">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums">₹{(p.value as number).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  )
}

interface YoYChartProps { filters: OverviewFilters; className?: string }

export default function YoYChart({ filters, className }: YoYChartProps) {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams(filters.ownerType ? { owner_type: filters.ownerType } : {})
    apiClient(apiUrl("analytics/yoy", params))
      .then((r) => r.json())
      .then((j) => { if (j.status === "success") setData(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters.ownerType])

  const thisYear = data?.thisYear
  const lastYear = data?.lastYear

  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">Year-over-Year</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Income & expenses: {lastYear} vs {thisYear}</p>
        </div>
        {data?.summary && (
          <div className="text-right text-xs text-muted-foreground space-y-0.5">
            <p>{thisYear} income: <span className="font-semibold text-emerald-600">₹{(data.summary.thisYear.income / 100000).toFixed(1)}L</span></p>
            <p>{lastYear} income: <span className="font-semibold text-emerald-500/70">₹{(data.summary.lastYear.income / 100000).toFixed(1)}L</span></p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-[260px] flex items-end gap-1 px-4 pb-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 bg-muted rounded-t animate-pulse" style={{ height: `${30 + Math.abs(Math.sin(i)) * 50}%` }} />
          ))}
        </div>
      ) : (
        <div className="h-[260px] px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.data ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey={`${thisYear}_income`}  name={`${thisYear} Income`}  fill="#10b981" radius={[2,2,0,0]} />
              <Bar dataKey={`${lastYear}_income`}  name={`${lastYear} Income`}  fill="#10b98166" radius={[2,2,0,0]} />
              <Bar dataKey={`${thisYear}_expense`} name={`${thisYear} Expense`} fill="#f43f5e" radius={[2,2,0,0]} />
              <Bar dataKey={`${lastYear}_expense`} name={`${lastYear} Expense`} fill="#f43f5e66" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
