"use client"

import { useEffect, useRef, useState } from "react"
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { SkeletonBlock } from "@/components/ui/states"
import type { SummaryData } from "./use-overview-data"

// ─── Animated counter ─────────────────────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start   = performance.now()
    const from    = 0
    const animate = (now: number) => {
      const elapsed  = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return value
}

// ─── Single card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  iconBg: string
  valueColor?: string
  trend?: "positive" | "negative" | "neutral"
  loading?: boolean
}

function StatCard({ label, value, icon, iconBg, valueColor = "text-foreground", trend, loading }: StatCardProps) {
  const animated = useAnimatedCounter(loading ? 0 : value)
  const display  = `₹${animated.toLocaleString("en-IN")}`

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Subtle gradient accent */}
      <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10", iconBg)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
          {loading ? (
            <SkeletonBlock className="h-8 w-32 rounded-lg" />
          ) : (
            <p className={cn("text-2xl font-bold tnum tracking-tight", valueColor)}>{display}</p>
          )}
        </div>
        <div className={cn("flex items-center justify-center w-11 h-11 rounded-xl shrink-0", iconBg)}>
          {icon}
        </div>
      </div>

      {trend && !loading && (
        <div className={cn(
          "flex items-center gap-1 mt-3 text-xs font-medium",
          trend === "positive" ? "text-success-text" : trend === "negative" ? "text-destructive-text" : "text-muted-foreground"
        )}>
          {trend === "positive" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          <span>Last 12 months</span>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-3 w-20 rounded" />
          <SkeletonBlock className="h-8 w-32 rounded-lg" />
        </div>
        <SkeletonBlock className="w-11 h-11 rounded-xl" />
      </div>
    </div>
  )
}

// ─── Summary Cards strip ──────────────────────────────────────────────────────

interface SummaryCardsProps {
  data: SummaryData | null
  loading: boolean
}

export default function SummaryCards({ data, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  const cards = [
    {
      label:      "Total Income",
      value:      data?.totalIncome ?? 0,
      icon:       <ArrowUpCircle className="h-5 w-5 text-success-subtle-foreground" />,
      iconBg:     "bg-success-subtle",
      valueColor: "text-success-text",
      trend:      "positive" as const,
    },
    {
      label:      "Total Expenses",
      value:      data?.totalExpense ?? 0,
      icon:       <ArrowDownCircle className="h-5 w-5 text-destructive-subtle-foreground" />,
      iconBg:     "bg-destructive-subtle",
      valueColor: "text-destructive-text",
      trend:      "negative" as const,
    },
    {
      label:      "Total Investments",
      value:      data?.totalInvestment ?? 0,
      icon:       <PiggyBank className="h-5 w-5 text-info-subtle-foreground" />,
      iconBg:     "bg-info-subtle",
      valueColor: "text-info-text",
      trend:      "positive" as const,
    },
    {
      label:      "Net Balance",
      value:      Math.abs(data?.balance ?? 0),
      icon:       <Wallet className="h-5 w-5 text-info-subtle-foreground" />,
      iconBg:     "bg-info-subtle",
      valueColor: (data?.balance ?? 0) >= 0 ? "text-info-text" : "text-destructive-text",
      trend:      ((data?.balance ?? 0) >= 0 ? "positive" : "negative") as "positive" | "negative",
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} loading={loading} />
      ))}
    </div>
  )
}
