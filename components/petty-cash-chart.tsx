"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export type PettyCashTrendItem = { month: string; amount: number }

interface PettyCashChartProps {
  pettyCashTrends: PettyCashTrendItem[]
}

interface TooltipData {
  month: string
  amount: number
  x: number
  y: number
}

// Format ₹ value for y-axis ticks
const formatAxisLabel = (value: number) => {
  if (value >= 1_000_000) return `₹${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `₹${(value / 1_000).toFixed(0)}K`
  return `₹${value}`
}

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`

const roundUp = (value: number) => Math.ceil(value / 1_000) * 1_000 || 1_000

export default function PettyCashChart({ pettyCashTrends }: PettyCashChartProps) {
  const [tooltip, setTooltip]       = useState<TooltipData | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 280 })
  const containerRef                = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setDimensions({ width: Math.max(width - 32, 260), height: 280 })
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const maxValue = Math.max(...pettyCashTrends.map((d) => d.amount), 1)
  const yAxisMax = roundUp(maxValue * 1.15)       // 15 % head-room
  const yAxisTicks = Array.from({ length: 6 }, (_, i) => (yAxisMax * (5 - i)) / 5)

  const padding    = { top: 30, right: 20, bottom: 50, left: 60 }
  const chartW     = dimensions.width
  const chartH     = dimensions.height
  const areaW      = chartW - padding.left - padding.right
  const areaH      = chartH - padding.top  - padding.bottom
  const colW       = areaW / (pettyCashTrends.length || 1)
  const barW       = Math.max(colW * 0.5, 8)   // narrower for 12 months

  const totalAmount = pettyCashTrends.reduce((s, d) => s + d.amount, 0)

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>, item: PettyCashTrendItem) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
    setTooltip({ month: item.month, amount: item.amount, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  if (dimensions.width === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Petty Cash Trends</CardTitle>
          <CardDescription>Last 12 months overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            Loading chart…
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Petty Cash Trends</CardTitle>
            <CardDescription>Last 12 months overview</CardDescription>
          </div>
          {totalAmount > 0 && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">6-month total</div>
              <div className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="h-[300px]">
        {pettyCashTrends.every((d) => d.amount === 0) ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No petty cash data for the last 6 months
          </div>
        ) : (
          <div ref={containerRef} className="relative w-full">
            <svg
              width={chartW}
              height={chartH}
              className="w-full bg-gray-50 dark:bg-gray-900 rounded-lg overflow-visible"
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Horizontal grid lines + y-axis labels */}
              {yAxisTicks.map((tick, i) => {
                const y = padding.top + (areaH * i) / 5
                return (
                  <g key={i}>
                    <line
                      x1={padding.left} y1={y}
                      x2={chartW - padding.right} y2={y}
                      stroke="#e5e7eb" strokeWidth="0.5"
                      className="dark:stroke-gray-700"
                    />
                    <text
                      x={padding.left - 8} y={y + 3}
                      textAnchor="end"
                      className="fill-gray-500 dark:fill-gray-400"
                      fontSize="10"
                    >
                      {formatAxisLabel(tick)}
                    </text>
                  </g>
                )
              })}

              {/* Bars */}
              {pettyCashTrends.map((item, idx) => {
                const barH   = item.amount > 0 ? (item.amount / yAxisMax) * areaH : 0
                const barX   = padding.left + idx * colW + (colW - barW) / 2
                const barY   = padding.top + areaH - barH
                const labelX = padding.left + idx * colW + colW / 2

                return (
                  <g key={item.month}>
                    {/* Bar with rounded top corners (via clip path trick) */}
                    {barH > 0 && (
                      <rect
                        x={barX}
                        y={barY}
                        width={barW}
                        height={barH}
                        rx="4"
                        ry="4"
                        fill="#7c3aed"
                        opacity={tooltip?.month === item.month ? 1 : 0.82}
                        className="transition-opacity duration-150 cursor-pointer"
                        onMouseMove={(e) => handleMouseMove(e, item)}
                      />
                    )}
                    {/* Zero-height placeholder (still shows month label) */}
                    {barH === 0 && (
                      <rect
                        x={barX} y={padding.top + areaH - 1}
                        width={barW} height={1}
                        fill="#7c3aed" opacity={0.3}
                      />
                    )}
                    {/* Month label */}
                    <text
                      x={labelX}
                      y={chartH - padding.bottom + 16}
                      textAnchor="middle"
                      className="fill-gray-600 dark:fill-gray-400"
                      fontSize="11"
                    >
                      {item.month}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Hover tooltip */}
            {tooltip && (
              <div
                className="absolute z-10 bg-gray-900 dark:bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-700 min-w-[150px] pointer-events-none"
                style={{
                  left: Math.min(tooltip.x + 12, chartW - 170),
                  top:  Math.max(tooltip.y - 12, 4),
                }}
              >
                <div className="font-semibold text-base mb-1">{tooltip.month}</div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#7c3aed" }} />
                  <span className="text-gray-300 text-sm">Petty Cash</span>
                  <span className="font-medium text-sm ml-auto">{formatCurrency(tooltip.amount)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
