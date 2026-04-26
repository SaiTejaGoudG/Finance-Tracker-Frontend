"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import type { OverviewFilters } from "./use-overview-data"

function fmtY(v: number) {
  if (Math.abs(v) >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`
  if (Math.abs(v) >= 1_000)   return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${v}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const gap = payload[0]?.value as number
  return (
    <div className="rounded-xl border bg-background/95 shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold mb-1.5">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Surplus</span>
        <span className={cn("font-bold tabular-nums", gap >= 0 ? "text-emerald-600" : "text-red-500")}>
          {gap >= 0 ? "+" : ""}₹{Math.abs(gap).toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  )
}

interface GapTrendChartProps { filters: OverviewFilters; className?: string }

export default function GapTrendChart({ filters, className }: GapTrendChartProps) {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      startDate: filters.startDate, endDate: filters.endDate,
      ...(filters.ownerType ? { owner_type: filters.ownerType } : {}),
    })
    apiClient(apiUrl("analytics/gap-trend", params))
      .then((r) => r.json())
      .then((j) => { if (j.status === "success") setData(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters.startDate, filters.endDate, filters.ownerType])

  const trend   = data?.trend ?? "stable"
  const avgGap  = data?.avgGap ?? 0
  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus
  const trendColor = trend === "improving" ? "text-emerald-600" : trend === "declining" ? "text-red-500" : "text-muted-foreground"

  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">Income − Expense Gap</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Monthly surplus or deficit</p>
        </div>
        <div className={cn("flex items-center gap-1.5 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span className="capitalize">{trend}</span>
          <span className="text-muted-foreground font-normal">· avg {fmtY(avgGap)}</span>
        </div>
      </div>

      {loading ? (
        <div className="h-[200px] bg-muted/30 animate-pulse rounded-b-2xl" />
      ) : (
        <div className="h-[200px] px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.data ?? []} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.02} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
              <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.2} strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="gap"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradPos)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
