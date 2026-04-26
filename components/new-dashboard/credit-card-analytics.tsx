"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CreditCardData, CreditCardItem } from "./use-overview-data"

// ─── Palette (one colour per card, consistent) ─────────────────────────────────

const CARD_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#f43f5e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
]
function cardColor(idx: number) { return CARD_COLORS[idx % CARD_COLORS.length] }

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmtINR(v: number) {
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`
  if (v >= 1_000)   return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${v}`
}
function fmtFull(v: number) { return `₹${v.toLocaleString("en-IN")}` }

// ─── Custom tooltip for chart ──────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, p: any) => s + (p.value as number), 0)
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg p-3 text-xs min-w-[160px] space-y-1.5">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums">{fmtFull(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="flex items-center justify-between gap-4 border-t pt-1.5 mt-1">
          <span className="text-muted-foreground font-medium">Total</span>
          <span className="font-bold tabular-nums">{fmtFull(total)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Per-card row ──────────────────────────────────────────────────────────────

function CardRow({ card, color, grandTotal }: { card: CreditCardItem; color: string; grandTotal: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium truncate">{card.card_name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {card.transaction_count} txn{card.transaction_count !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-bold tabular-nums">{fmtFull(card.total)}</span>
          <span className="text-xs text-muted-foreground ml-1.5">{card.percentage}%</span>
        </div>
      </div>
      {/* Share bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${card.percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 p-5">
      {/* Summary pill */}
      <div className="h-14 rounded-xl bg-muted animate-pulse" />
      {/* Card rows */}
      <div className="space-y-4">
        {[80, 65, 45].map((w, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <div className="h-3 rounded bg-muted animate-pulse" style={{ width: `${w}%` }} />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-1.5 rounded-full bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      {/* Chart */}
      <div className="h-48 rounded-xl bg-muted animate-pulse" />
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CreditCardAnalyticsProps {
  data: CreditCardData | null
  loading?: boolean
  className?: string
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CreditCardAnalytics({ data, loading, className }: CreditCardAnalyticsProps) {
  const isEmpty = !data || data.cards.length === 0

  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 shrink-0">
          <CreditCard className="h-4 w-4 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Credit Card Spend</h3>
          <p className="text-xs text-muted-foreground">Per-card breakdown · Monthly trend</p>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <CreditCard className="h-8 w-8 opacity-30" />
          <p className="text-sm">No credit card transactions in this period</p>
        </div>
      ) : (
        <div className="p-5 space-y-6">

          {/* ── 1. Summary pill ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-xl bg-indigo-50 dark:bg-indigo-900/20 px-5 py-4">
            <div>
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Total Credit Card Spend
              </p>
              <p className="text-2xl font-bold tabular-nums text-indigo-700 dark:text-indigo-300 mt-0.5">
                {fmtFull(data!.total)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Cards used</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{data!.cards.length}</p>
            </div>
          </div>

          {/* ── 2. Per-card breakdown ────────────────────────────────────────── */}
          <div className="space-y-4">
            {data!.cards.map((card, idx) => (
              <CardRow
                key={card.card_id}
                card={card}
                color={cardColor(idx)}
                grandTotal={data!.total}
              />
            ))}
          </div>

          {/* ── 3. Monthly stacked bar chart ─────────────────────────────────── */}
          {data!.monthlyData.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Monthly spend by card
              </p>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data!.monthlyData}
                    margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                    barSize={data!.monthlyData.length > 6 ? 14 : 22}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      strokeOpacity={0.06}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={fmtINR}
                      tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.04 }} />
                    <Legend
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    />
                    {data!.cardIds.map((id, idx) => (
                      <Bar
                        key={id}
                        dataKey={id}
                        name={data!.cardNames[id] ?? id}
                        stackId="cards"
                        fill={cardColor(idx)}
                        radius={idx === data!.cardIds.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
