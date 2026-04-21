"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { cn } from "@/lib/utils"
import type { PettyCashMonth } from "./use-overview-data"

// ─── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value as number
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Petty Cash</span>
        <span className="font-medium tabular-nums text-violet-600">
          ₹{val.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  )
}

// ─── Y-axis formatter ──────────────────────────────────────────────────────────

function fmtY(v: number) {
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`
  if (v >= 1_000)   return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${v}`
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface PettyCashAreaProps {
  data: PettyCashMonth[]
  total?: number
  loading?: boolean
  className?: string
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function AreaSkeleton() {
  return (
    <div className="h-[220px] flex items-end gap-1.5 px-4 pb-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-muted rounded-t-sm animate-pulse"
          style={{ height: `${20 + Math.abs(Math.sin(i * 0.8)) * 60}%` }}
        />
      ))}
    </div>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PettyCashArea({ data, total = 0, loading, className }: PettyCashAreaProps) {
  const isEmpty = data.length === 0 || data.every((d) => d.amount === 0)

  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Petty Cash Trends</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Monthly petty cash expenses</p>
        </div>
        {!loading && total > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-bold text-violet-600 tabular-nums">
              ₹{total.toLocaleString("en-IN")}
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <AreaSkeleton />
      ) : isEmpty ? (
        <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
          No petty cash data for this period
        </div>
      ) : (
        <div className="h-[220px] w-full px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradPetty" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />

              <XAxis
                dataKey="label"
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
                width={48}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#7c3aed", strokeOpacity: 0.1, strokeWidth: 30 }} />

              <Area
                type="monotone"
                dataKey="amount"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#gradPetty)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "#7c3aed" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
