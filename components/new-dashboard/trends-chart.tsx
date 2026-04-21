"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import type { TrendMonth } from "./use-overview-data"

// ─── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg p-3 text-xs space-y-1.5 min-w-[160px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums">
            ₹{(p.value as number).toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface TrendsChartProps {
  data: TrendMonth[]
  loading?: boolean
  className?: string
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function TrendsChartSkeleton() {
  return (
    <div className="h-[320px] flex items-end gap-2 px-4 pb-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-muted rounded-t-md animate-pulse"
          style={{ height: `${30 + Math.sin(i) * 20 + Math.random() * 40}%` }}
        />
      ))}
    </div>
  )
}

// ─── Y-axis formatter ──────────────────────────────────────────────────────────

function fmtY(v: number) {
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`
  if (v >= 1_000)   return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${v}`
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TrendsChart({ data, loading, className }: TrendsChartProps) {
  if (loading) {
    return (
      <div className={cn("rounded-2xl border bg-card shadow-sm overflow-hidden", className)}>
        <div className="px-5 pt-5 pb-2">
          <div className="h-5 w-40 rounded bg-muted animate-pulse mb-1" />
          <div className="h-3 w-56 rounded bg-muted animate-pulse" />
        </div>
        <TrendsChartSkeleton />
      </div>
    )
  }

  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-foreground">Monthly Trends</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Income · Expense · Investment over time</p>
      </div>

      <div className="h-[300px] w-full px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradInvestment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />

            <XAxis
              dataKey="shortLabel"
              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={fmtY}
              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.1, strokeWidth: 40, strokeLinecap: "round" }} />

            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />

            <Area
              type="monotone"
              dataKey="Income"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#gradIncome)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="Expense"
              stroke="#f43f5e"
              strokeWidth={2}
              fill="url(#gradExpense)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="Investment"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#gradInvestment)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
