"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCategoryMeta } from "@/lib/tx-meta"

type ExpenseDistributionProps = {
  expenseDistribution: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

type Slice = {
  category: string
  amount: number
  percentage: number
  color: string
  emoji: string
  startAngle: number
  endAngle: number
}

// helpers
const deg2rad = (deg: number) => (deg * Math.PI) / 180
const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = { x: cx + r * Math.cos(deg2rad(startAngle)), y: cy + r * Math.sin(deg2rad(startAngle)) }
  const end = { x: cx + r * Math.cos(deg2rad(endAngle)), y: cy + r * Math.sin(deg2rad(endAngle)) }
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`
}

export default function ExpenseDistribution({ expenseDistribution }: ExpenseDistributionProps) {
  // Total amount
  const total = useMemo(
    () => expenseDistribution.reduce((sum, item) => sum + (item.amount || 0), 0),
    [expenseDistribution],
  )

  // Compute slices using getCategoryMeta colors so chart slices and emoji icons always match
  const slices: Slice[] = useMemo(() => {
    let current = -90
    return expenseDistribution.map((item) => {
      const { emoji, color } = getCategoryMeta(item.category)
      const angle = (item.percentage / 100) * 360
      const s: Slice = {
        category: item.category,
        amount: item.amount,
        percentage: item.percentage,
        color,
        emoji,
        startAngle: current,
        endAngle: current + angle,
      }
      current += angle
      return s
    })
  }, [expenseDistribution])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Expense Distribution</CardTitle>
        <CardDescription>Breakdown of your expenses by category</CardDescription>
      </CardHeader>

      {/* Exactly match comparison card content height (300px) */}
      <CardContent className="h-[300px]">
        {expenseDistribution.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">No expense data</div>
        ) : (
          <div className="flex h-full gap-6">
            {/* Donut */}
            <div className="relative flex items-center justify-center">
              <svg
                width="220"
                height="220"
                viewBox="0 0 220 220"
                role="img"
                aria-label="Expense distribution pie chart"
              >
                <title>Expense Distribution</title>
                {slices.map((slice, idx) => (
                  <path
                    key={slice.category + idx}
                    d={describeArc(110, 110, 100, slice.startAngle, slice.endAngle)}
                    fill={slice.color}
                    stroke="hsl(var(--background))"
                    strokeWidth="1"
                  >
                    <title>
                      {slice.category}: ₹{slice.amount.toLocaleString("en-IN")} ({slice.percentage.toFixed(1)}%)
                    </title>
                  </path>
                ))}
                {/* Donut hole */}
                <circle cx="110" cy="110" r="55" fill="hsl(var(--background))" />
                <text x="110" y="102" textAnchor="middle" style={{ fill: "hsl(var(--foreground))" }} fontSize="12">
                  {"Total"}
                </text>
                <text x="110" y="122" textAnchor="middle" style={{ fill: "hsl(var(--foreground))" }} fontSize="16">
                  {"₹" + total.toLocaleString("en-IN")}
                </text>
              </svg>
            </div>

            {/* Right column: scrollable categories + fixed total */}
            <div className="flex-1 min-w-0 h-full flex flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto pr-2" aria-label="Expense categories and values">
                <div className="space-y-2">
                  {slices.map((slice) => (
                    <div key={slice.category} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* iOS-style emoji icon — color matches the donut slice */}
                        <span
                          className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-sm select-none"
                          style={{ backgroundColor: slice.color }}
                          aria-hidden
                        >
                          {slice.emoji}
                        </span>
                        <span className="truncate text-sm">{slice.category}</span>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <div className="font-medium text-sm">₹{(slice.amount || 0).toLocaleString("en-IN")}</div>
                        <div className="text-xs text-muted-foreground">{slice.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fixed total row */}
              <div className="border-t pt-2 mt-2 shrink-0">
                <div className="flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
