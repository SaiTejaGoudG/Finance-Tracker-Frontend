"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"

interface ChartData {
  month: string
  fullMonth: string
  income: number
  expenses: number
  investments: number
}

interface TooltipData {
  month: string
  income: number
  expenses: number
  investments: number
  x: number
  y: number
}

interface MonthlyTrendItem {
  label: string
  Income: number
  Expense: number
  Investment: number
}

interface ModernChartProps {
  monthlyTrend: MonthlyTrendItem[]
}

export default function ModernChart({ monthlyTrend }: ModernChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Update dimensions when container resizes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: Math.max(width - 32, 300), // Account for padding, minimum width
          height: 280, // Fixed height that fits well in card
        })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  // Convert API data to chart format - Changed order: Income, Expense, Investment
  const chartData: ChartData[] = monthlyTrend.map((item) => {
    return {
      month: item.label.split(" ")[0], // Extract month abbreviation
      fullMonth: item.label,
      income: item.Income,
      expenses: item.Expense, // Changed from investments to expenses
      investments: item.Investment, // Changed from expenses to investments
    }
  })

  // Find max value for scaling
  const maxValue = Math.max(...chartData.map((d) => Math.max(d.income, d.expenses, d.investments)), 1)

  // Round up the max value to a nice number for the y-axis
  const roundToNearestTenThousand = (value: number) => {
    return Math.ceil(value / 10000) * 10000
  }

  const yAxisMax = roundToNearestTenThousand(maxValue * 1.1) // Add 10% padding

  // Create y-axis ticks with appropriate intervals
  const yAxisTicks = Array.from({ length: 6 }, (_, i) => (yAxisMax * (5 - i)) / 5)

  // Format currency for y-axis labels
  const formatAxisLabel = (value: number) => {
    if (value >= 1000000) {
      return `₹${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}K`
    } else {
      return `₹${value}`
    }
  }

  // Format currency for tooltip
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
  }

  // Chart dimensions - responsive
  const chartWidth = dimensions.width
  const chartHeight = dimensions.height
  const padding = { top: 50, right: 30, bottom: 50, left: 60 }
  const chartAreaWidth = chartWidth - padding.left - padding.right
  const chartAreaHeight = chartHeight - padding.top - padding.bottom

  // Bar dimensions
  const monthWidth = chartAreaWidth / chartData.length
  const barWidth = Math.max((monthWidth - 16) / 3, 8) // 3 bars per month with spacing, minimum width
  const barSpacing = 2

  const handleMouseMove = (event: React.MouseEvent<SVGElement>, data: ChartData) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setTooltip({
      month: data.fullMonth,
      income: data.income,
      expenses: data.expenses, // Changed order
      investments: data.investments, // Changed order
      x,
      y,
    })
  }

  const handleMouseLeave = () => {
    setTooltip(null)
  }

  // Don't render if dimensions aren't set yet
  if (dimensions.width === 0) {
    return (
      <div ref={containerRef} className="w-full h-[280px] flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading chart...</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Legend - Updated order: Income, Expenses, Investments */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Income</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Expenses</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Investments</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          width={chartWidth}
          height={chartHeight}
          className="w-full bg-gray-50 dark:bg-gray-900 rounded-lg"
          onMouseLeave={handleMouseLeave}
        >
          {/* Horizontal grid lines */}
          {yAxisTicks.map((tickValue, i) => {
            const y = padding.top + (chartAreaHeight * i) / 5
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                  className="dark:stroke-gray-700"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                  fontSize="10"
                >
                  {formatAxisLabel(tickValue)}
                </text>
              </g>
            )
          })}

          {/* Bars - Updated order: Income, Expenses, Investments */}
          {chartData.map((data, monthIndex) => {
            const monthX = padding.left + monthIndex * monthWidth + (monthWidth - (barWidth * 3 + barSpacing * 2)) / 2

            // Calculate bar heights using the correct scale
            const incomeHeight = (data.income / yAxisMax) * chartAreaHeight
            const expenseHeight = (data.expenses / yAxisMax) * chartAreaHeight // Changed order
            const investmentHeight = (data.investments / yAxisMax) * chartAreaHeight // Changed order

            return (
              <g key={monthIndex}>
                {/* Income bar (first) */}
                <rect
                  x={monthX}
                  y={padding.top + chartAreaHeight - incomeHeight}
                  width={barWidth}
                  height={incomeHeight}
                  fill="#10B981"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  onMouseMove={(e) => handleMouseMove(e, data)}
                />

                {/* Expense bar (second) */}
                <rect
                  x={monthX + barWidth + barSpacing}
                  y={padding.top + chartAreaHeight - expenseHeight}
                  width={barWidth}
                  height={expenseHeight}
                  fill="#EF4444"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  onMouseMove={(e) => handleMouseMove(e, data)}
                />

                {/* Investment bar (third) */}
                <rect
                  x={monthX + (barWidth + barSpacing) * 2}
                  y={padding.top + chartAreaHeight - investmentHeight}
                  width={barWidth}
                  height={investmentHeight}
                  fill="#3B82F6"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  onMouseMove={(e) => handleMouseMove(e, data)}
                />

                {/* Month label */}
                <text
                  x={monthX + (barWidth * 3 + barSpacing * 2) / 2}
                  y={chartHeight - padding.bottom + 16}
                  textAnchor="middle"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                  fontSize="11"
                >
                  {data.month}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Tooltip - Updated order */}
        {tooltip && (
          <div
            className="absolute z-10 bg-gray-900 dark:bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-700 min-w-[180px]"
            style={{
              left: Math.min(tooltip.x + 10, chartWidth - 200),
              top: Math.max(tooltip.y - 10, 10),
            }}
          >
            <div className="font-semibold text-base mb-2">{tooltip.month}</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-sm"></div>
                  <span className="text-gray-300 text-sm">Income</span>
                </div>
                <span className="font-medium text-sm">{formatCurrency(tooltip.income)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-sm"></div>
                  <span className="text-gray-300 text-sm">Expenses</span>
                </div>
                <span className="font-medium text-sm">{formatCurrency(tooltip.expenses)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></div>
                  <span className="text-gray-300 text-sm">Investments</span>
                </div>
                <span className="font-medium text-sm">{formatCurrency(tooltip.investments)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
