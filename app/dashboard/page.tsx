"use client"

import { useState, useCallback } from "react"
import { Loader2, BarChart3, TrendingUp, PiggyBank, Target, Landmark, Wallet, Download, Sparkles, Coins, Users, Tag } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import LayoutWrapper           from "@/components/layout-wrapper"
import DateRangeFilter         from "@/components/new-dashboard/date-range-filter"
import SummaryCards            from "@/components/new-dashboard/summary-cards"
import AISummaryCard           from "@/components/new-dashboard/ai-summary-card"
import AnomalyBanner           from "@/components/new-dashboard/anomaly-banner"
import AIChatbot               from "@/components/new-dashboard/ai-chatbot"
import TrendsChart             from "@/components/new-dashboard/trends-chart"
import DistributionDonut       from "@/components/new-dashboard/distribution-donut"
import PettyCashArea           from "@/components/new-dashboard/petty-cash-area"
import CreditCardAnalytics     from "@/components/new-dashboard/credit-card-analytics"
import GapTrendChart           from "@/components/new-dashboard/gap-trend-chart"
import YoYChart                from "@/components/new-dashboard/yoy-chart"
import RecurringPanel          from "@/components/new-dashboard/recurring-panel"
import BudgetTracker           from "@/components/new-dashboard/budget-tracker"
import InvestmentTab           from "@/components/new-dashboard/investment-tab"
import MonthSummaryCard        from "@/components/new-dashboard/month-summary-card"
import FreelancingAnalytics    from "@/components/freelancing-analytics"
import ExpensesAnalytics       from "@/components/new-dashboard/analytics/expenses-analytics"
import IncomeAnalytics         from "@/components/new-dashboard/analytics/income-analytics"
import PettyCashAnalytics      from "@/components/new-dashboard/analytics/petty-cash-analytics"
import OwnerComparison         from "@/components/new-dashboard/analytics/owner-comparison"
import CategoryTrends          from "@/components/new-dashboard/analytics/category-trends"
import LoansTab                from "@/components/loans-tab"
import SavingsTab              from "@/components/savings-tab"
import GoalsTab                from "@/components/goals-tab"

import { useAuth }                         from "@/context/AuthContext"
import { useOverviewData, defaultFilters } from "@/components/new-dashboard/use-overview-data"
import type { OverviewFilters }            from "@/components/new-dashboard/use-overview-data"

// ─── CSV Export utility ───────────────────────────────────────────────────────

function exportCSV(data: any[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows    = data.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))
  const csv     = [headers.join(","), ...rows].join("\n")
  const blob    = new Blob([csv], { type: "text/csv" })
  const url     = URL.createObjectURL(blob)
  const a       = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Inner content ────────────────────────────────────────────────────────────

function DashboardContent() {
  const [filters, setFilters]     = useState<OverviewFilters>(defaultFilters)
  const [activeTab, setActiveTab] = useState("overview")

  const handleFilterChange = useCallback((next: OverviewFilters) => setFilters(next), [])

  const { summary, trends, expDist, incDist, petty, ccAnalytics } = useOverviewData(filters)

  const handleExportTrends = () => {
    if (trends.data?.data) exportCSV(trends.data.data, "trends.csv")
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your financial overview at a glance</p>
        </div>
        <button
          onClick={handleExportTrends}
          disabled={trends.loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-3 py-2 transition-colors disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Export trends CSV
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <DateRangeFilter filters={filters} onChange={handleFilterChange} />

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <SummaryCards data={summary.data} loading={summary.loading} />

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-5">
        <TabsList className="grid w-full grid-cols-7 h-10 rounded-xl border bg-muted/40 p-1">
          <TabsTrigger value="overview"     className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
            <BarChart3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="analytics"    className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
            <TrendingUp className="h-3.5 w-3.5" /><span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="budget"       className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
            <Target className="h-3.5 w-3.5" /><span className="hidden sm:inline">Budget</span>
          </TabsTrigger>
          <TabsTrigger value="loans"        className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
            <Landmark className="h-3.5 w-3.5" /><span className="hidden sm:inline">Loans</span>
          </TabsTrigger>
          <TabsTrigger value="savings"      className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
            <PiggyBank className="h-3.5 w-3.5" /><span className="hidden sm:inline">Savings</span>
          </TabsTrigger>
          <TabsTrigger value="goals"        className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
            <Target className="h-3.5 w-3.5" /><span className="hidden sm:inline">Goals</span>
          </TabsTrigger>
          <TabsTrigger value="ai-insights"  className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
            <Sparkles className="h-3.5 w-3.5" /><span className="hidden sm:inline">AI Insights</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ──────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-5 mt-0">
          <TrendsChart data={trends.data?.data ?? []} loading={trends.loading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <GapTrendChart filters={filters} />
            <YoYChart filters={filters} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <DistributionDonut
              expDist={expDist.data}
              incDist={incDist.data}
              loading={expDist.loading || incDist.loading}
            />
            <PettyCashArea
              data={petty.data?.data ?? []}
              total={petty.data?.total}
              loading={petty.loading}
            />
          </div>

          <RecurringPanel filters={filters} />
        </TabsContent>

        {/* ── Analytics (sub-tabbed: 7 sections) ───────────────────────────── */}
        <TabsContent value="analytics" className="mt-0 space-y-5">
          <Tabs defaultValue="freelancing" className="w-full space-y-4">
            <TabsList className="grid w-full grid-cols-7 h-9 rounded-xl border bg-muted/40 p-1">
              <TabsTrigger value="freelancing"   className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
                <TrendingUp className="h-3.5 w-3.5" /><span className="hidden sm:inline">Freelancing</span>
              </TabsTrigger>
              <TabsTrigger value="credit-cards"  className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
                <Wallet className="h-3.5 w-3.5" /><span className="hidden sm:inline">Credit Cards</span>
              </TabsTrigger>
              <TabsTrigger value="expenses"      className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
                <Tag className="h-3.5 w-3.5" /><span className="hidden sm:inline">Expenses</span>
              </TabsTrigger>
              <TabsTrigger value="income"        className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
                <TrendingUp className="h-3.5 w-3.5" /><span className="hidden sm:inline">Income</span>
              </TabsTrigger>
              <TabsTrigger value="investments-a" className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
                <Wallet className="h-3.5 w-3.5" /><span className="hidden sm:inline">Investments</span>
              </TabsTrigger>
              <TabsTrigger value="petty-cash"    className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
                <Coins className="h-3.5 w-3.5" /><span className="hidden sm:inline">Petty Cash</span>
              </TabsTrigger>
              <TabsTrigger value="owner-wise"    className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
                <Users className="h-3.5 w-3.5" /><span className="hidden sm:inline">By Owner</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="freelancing"   className="mt-0"><FreelancingAnalytics ownerType={filters.ownerType || undefined} /></TabsContent>
            <TabsContent value="credit-cards"  className="mt-0"><CreditCardAnalytics data={ccAnalytics.data} loading={ccAnalytics.loading} /></TabsContent>
            <TabsContent value="expenses"      className="mt-0"><ExpensesAnalytics filters={filters} /></TabsContent>
            <TabsContent value="income"        className="mt-0"><IncomeAnalytics filters={filters} /></TabsContent>
            <TabsContent value="investments-a" className="mt-0"><InvestmentTab filters={filters} /></TabsContent>
            <TabsContent value="petty-cash"    className="mt-0"><PettyCashAnalytics filters={filters} /></TabsContent>
            <TabsContent value="owner-wise"    className="mt-0"><OwnerComparison filters={filters} /></TabsContent>
          </Tabs>

          {/* Category Trends — always visible at bottom */}
          <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Category Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pick any category and track its month-by-month spend</p>
            </div>
            <CategoryTrends filters={filters} />
          </div>
        </TabsContent>

        {/* ── Budget ────────────────────────────────────────────────────────── */}
        <TabsContent value="budget" className="mt-0">
          <BudgetTracker filters={filters} />
        </TabsContent>

        {/* ── Loans ─────────────────────────────────────────────────────────── */}
        <TabsContent value="loans" className="mt-0">
          <LoansTab />
        </TabsContent>

        {/* ── Savings ───────────────────────────────────────────────────────── */}
        <TabsContent value="savings" className="mt-0">
          <SavingsTab />
        </TabsContent>

        {/* ── Goals ─────────────────────────────────────────────────────────── */}
        <TabsContent value="goals" className="mt-0">
          <GoalsTab />
        </TabsContent>

        {/* ── AI Insights ───────────────────────────────────────────────────── */}
        <TabsContent value="ai-insights" className="space-y-5 mt-0">
          {/* AI Summary */}
          <AISummaryCard filters={filters} />

          {/* Spending Spike Anomalies */}
          <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Spending Spikes</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Months where a category exceeded 1.8× its average spend
              </p>
            </div>
            <AnomalyBanner filters={filters} />
          </div>

          {/* Month-close Summary */}
          <MonthSummaryCard filters={filters} />
        </TabsContent>

      </Tabs>

      {/* ── Floating AI chatbot (persists across all tabs) ────────────────────── */}
      <AIChatbot filters={filters} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <LayoutWrapper>
      <DashboardContent />
    </LayoutWrapper>
  )
}
