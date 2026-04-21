"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { TrendingUp, Calendar, IndianRupee, Award } from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type FreelancingTrendItem = {
  month: string     // "Apr"
  year: string      // "2026"
  label: string     // "Apr 26"
  amount: number
  count: number
}

export type FreelancingMonthItem = {
  month: string
  year: string
  label: string     // "Apr YYYY"
  amount: number
  count: number
}

export type FreelancingData = {
  totalEarned: number
  activeMonths: number
  avgPerActiveMonth: number
  bestMonth: { month: string; year: string; amount: number } | null
  timeline: FreelancingTrendItem[]          // 12 months, gaps = 0
  monthlyBreakdown: FreelancingMonthItem[]  // only active months, newest first
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`

const fmtAxis = (v: number) => {
  if (v >= 1_000_000) return `₹${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${v}`
}

const roundUp = (v: number) => Math.ceil(v / 1_000) * 1_000 || 1_000

// ─── Stat Pill ─────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="flex items-center gap-3 bg-muted/50 border rounded-xl px-4 py-3 min-w-0">
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${accent ?? "bg-indigo-100"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="font-semibold text-sm truncate">{value}</div>
      </div>
    </div>
  )
}

// ─── Chart ─────────────────────────────────────────────────────────────────────

interface TooltipData { label: string; amount: number; count: number; x: number; y: number }

function FreelancingBarChart({ timeline }: { timeline: FreelancingTrendItem[] }) {
  const [tooltip, setTooltip]       = useState<TooltipData | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0 })
  const containerRef                = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setDimensions({ width: Math.max(width, 280) })
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const chartH  = 240
  const padding = { top: 24, right: 16, bottom: 44, left: 56 }
  const areaW   = dimensions.width - padding.left - padding.right
  const areaH   = chartH - padding.top - padding.bottom
  const maxVal  = Math.max(...timeline.map((d) => d.amount), 1)
  const yMax    = roundUp(maxVal * 1.2)
  const yTicks  = Array.from({ length: 5 }, (_, i) => (yMax * (4 - i)) / 4)
  const colW    = areaW / timeline.length
  const barW    = Math.max(colW * 0.55, 8)

  const handleMove = (e: React.MouseEvent<SVGRectElement>, item: FreelancingTrendItem) => {
    const svgRect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
    setTooltip({ label: item.month + " " + item.year, amount: item.amount, count: item.count, x: e.clientX - svgRect.left, y: e.clientY - svgRect.top })
  }

  if (dimensions.width === 0) {
    return <div ref={containerRef} className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width={dimensions.width}
        height={chartH}
        className="w-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-visible"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid + Y axis */}
        {yTicks.map((tick, i) => {
          const y = padding.top + (areaH * i) / 4
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={dimensions.width - padding.right} y2={y}
                stroke="#e5e7eb" strokeWidth="0.5" className="dark:stroke-gray-700" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end"
                className="fill-gray-400 dark:fill-gray-500" fontSize="9.5">
                {fmtAxis(tick)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {timeline.map((item, idx) => {
          const barH   = item.amount > 0 ? (item.amount / yMax) * areaH : 0
          const barX   = padding.left + idx * colW + (colW - barW) / 2
          const barY   = padding.top + areaH - barH
          const labelX = padding.left + idx * colW + colW / 2
          const active = item.amount > 0
          const highlighted = tooltip?.label === item.month + " " + item.year

          return (
            <g key={item.label}>
              {active ? (
                <rect
                  x={barX} y={barY} width={barW} height={barH}
                  rx="3" ry="3"
                  fill="#6366f1"
                  opacity={highlighted ? 1 : 0.78}
                  className="transition-opacity duration-100 cursor-pointer"
                  onMouseMove={(e) => handleMove(e, item)}
                />
              ) : (
                /* Subtle placeholder for months with no income */
                <rect
                  x={barX + barW * 0.25} y={padding.top + areaH - 3}
                  width={barW * 0.5} height={3}
                  rx="2" fill="#e5e7eb" className="dark:fill-gray-700"
                />
              )}

              {/* X-axis label — month abbrev */}
              <text
                x={labelX} y={chartH - padding.bottom + 14}
                textAnchor="middle" fontSize="9.5"
                className={active
                  ? "fill-gray-700 dark:fill-gray-300 font-medium"
                  : "fill-gray-400 dark:fill-gray-600"
                }
              >
                {item.month}
              </text>
              {/* Year underneath month, only show when year changes */}
              {(idx === 0 || timeline[idx - 1].year !== item.year) && (
                <text
                  x={labelX} y={chartH - padding.bottom + 26}
                  textAnchor="middle" fontSize="8"
                  className="fill-gray-400 dark:fill-gray-600"
                >
                  {item.year.slice(2)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 bg-gray-900 dark:bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-700 min-w-[160px] pointer-events-none"
          style={{
            left: Math.min(tooltip.x + 12, dimensions.width - 180),
            top:  Math.max(tooltip.y - 16, 0),
          }}
        >
          <div className="font-semibold mb-1">{tooltip.label}</div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
            <span className="text-gray-300">Freelancing</span>
            <span className="font-medium ml-auto">{fmt(tooltip.amount)}</span>
          </div>
          {tooltip.count > 1 && (
            <div className="text-xs text-gray-400 mt-1">{tooltip.count} transactions</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface FreelancingAnalyticsProps {
  ownerType?: string
}

export default function FreelancingAnalytics({ ownerType }: FreelancingAnalyticsProps) {
  const [data, setData]       = useState<FreelancingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (ownerType) params.append("owner_type", ownerType)
      const url = apiUrl("analytics/freelancing", params)
      const res = await apiClient(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.status === "success") setData(json.data)
      else throw new Error(json.message || "API error")
    } catch (e: any) {
      setError(e.message || "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [ownerType])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Loading skeleton ──
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">💻</span> Freelancing Analytics
          </CardTitle>
          <CardDescription>Overall earnings and monthly breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/60 animate-pulse" />
            ))}
          </div>
          <div className="h-[240px] rounded-xl bg-muted/60 animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">💻</span> Freelancing Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            {error ?? "No data available"}
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasData = data.totalEarned > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">💻</span> Freelancing Analytics
            </CardTitle>
            <CardDescription>
              Overall earnings and monthly breakdown · last 12 months
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stat pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatPill
            icon={<IndianRupee className="h-4 w-4 text-indigo-600" />}
            label="Total Earned"
            value={fmt(data.totalEarned)}
            accent="bg-indigo-100 dark:bg-indigo-900/40"
          />
          <StatPill
            icon={<Calendar className="h-4 w-4 text-violet-600" />}
            label="Active Months"
            value={`${data.activeMonths} month${data.activeMonths !== 1 ? "s" : ""}`}
            accent="bg-violet-100 dark:bg-violet-900/40"
          />
          <StatPill
            icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
            label="Avg / Active Month"
            value={data.avgPerActiveMonth > 0 ? fmt(data.avgPerActiveMonth) : "—"}
            accent="bg-emerald-100 dark:bg-emerald-900/40"
          />
          <StatPill
            icon={<Award className="h-4 w-4 text-amber-600" />}
            label="Best Month"
            value={data.bestMonth ? `${data.bestMonth.month} ${data.bestMonth.year}` : "—"}
            accent="bg-amber-100 dark:bg-amber-900/40"
          />
        </div>

        {!hasData ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No freelancing income recorded yet
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
            {/* Bar chart */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">Monthly earnings (last 12 months)</p>
              <FreelancingBarChart timeline={data.timeline} />
            </div>

            {/* Right: active months breakdown */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">Active months</p>
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {data.monthlyBreakdown.map((m) => {
                  const pct = data.totalEarned > 0
                    ? Math.round((m.amount / data.totalEarned) * 100)
                    : 0
                  return (
                    <div key={m.label} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{m.label}</span>
                          <span className="text-xs tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold ml-2 shrink-0">
                            {fmt(m.amount)}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-7 text-right shrink-0">
                        {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
