"use client"

import { useState } from "react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts"
import { cn } from "@/lib/utils"
import type { DistributionData, DistributionItem } from "./use-overview-data"

// ─── Category colors ───────────────────────────────────────────────────────────

const PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#06b6d4", "#a855f7",
]

function getColor(idx: number) {
  return PALETTE[idx % PALETTE.length]
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold mb-1 truncate max-w-[140px]">{item.name}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Amount</span>
        <span className="font-medium tabular-nums">₹{(item.value as number).toLocaleString("en-IN")}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Share</span>
        <span className="font-medium">{item.payload?.percentage?.toFixed(1)}%</span>
      </div>
    </div>
  )
}

// ─── Legend row ────────────────────────────────────────────────────────────────

function LegendRow({ item, color, rank }: { item: DistributionItem; color: string; rank: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-4 shrink-0">{rank}.</span>
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs flex-1 truncate text-foreground">{item.category}</span>
      <span className="text-xs tabular-nums text-muted-foreground">
        ₹{item.amount >= 1000 ? `${(item.amount / 1000).toFixed(0)}K` : item.amount.toLocaleString("en-IN")}
      </span>
      <span className="text-xs tabular-nums font-medium w-10 text-right">{item.percentage.toFixed(1)}%</span>
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function DonutSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 p-5">
      <div className="w-40 h-40 rounded-full bg-muted animate-pulse" />
      <div className="w-full space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${80 - i * 10}%` }} />
        ))}
      </div>
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DistributionDonutProps {
  expDist: DistributionData | null
  incDist: DistributionData | null
  loading?: boolean
  className?: string
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DistributionDonut({ expDist, incDist, loading, className }: DistributionDonutProps) {
  const [tab, setTab] = useState<"expense" | "income">("expense")

  const current  = tab === "expense" ? expDist : incDist
  const items    = current?.data ?? []
  const total    = current?.total ?? 0
  const typeLabel = tab === "expense" ? "Expenses" : "Income"

  const visibleItems = items.slice(0, 8)

  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Distribution</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Category-wise breakdown</p>
        </div>
        {/* Toggle */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 text-xs">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium capitalize transition-colors",
                tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "expense" ? "Expenses" : "Income"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <DonutSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
          No data for this period
        </div>
      ) : (
        <div className="px-5 pb-5 grid grid-cols-1 gap-4">
          {/* Donut */}
          <div className="h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={visibleItems}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="80%"
                  paddingAngle={2}
                  labelLine={false}
                >
                  {visibleItems.map((item, idx) => (
                    <Cell key={item.category} fill={getColor(idx)} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-muted-foreground">Total {typeLabel}</span>
              <span className="text-sm font-bold tabular-nums">
                ₹{total >= 100_000
                  ? `${(total / 100_000).toFixed(1)}L`
                  : total >= 1_000
                  ? `${(total / 1_000).toFixed(0)}K`
                  : total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2.5">
            {visibleItems.map((item, idx) => (
              <LegendRow key={item.category} item={item} color={getColor(idx)} rank={idx + 1} />
            ))}
            {items.length > 8 && (
              <p className="text-xs text-muted-foreground pt-1">+ {items.length - 8} more categories</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
