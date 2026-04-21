"use client"

import { useState, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutDashboard, TrendingUp, PiggyBank, Target, Landmark } from "lucide-react"

import LayoutWrapper           from "@/components/layout-wrapper"
import DateRangeFilter         from "@/components/new-dashboard/date-range-filter"
import SummaryCards             from "@/components/new-dashboard/summary-cards"
import TrendsChart              from "@/components/new-dashboard/trends-chart"
import DistributionDonut        from "@/components/new-dashboard/distribution-donut"
import PettyCashArea            from "@/components/new-dashboard/petty-cash-area"
import FreelancingAnalytics     from "@/components/freelancing-analytics"
import LoansTab                 from "@/components/loans-tab"
import SavingsTab               from "@/components/savings-tab"
import GoalsTab                 from "@/components/goals-tab"

import { useAuth }                         from "@/context/AuthContext"
import { useOverviewData, defaultFilters } from "@/components/new-dashboard/use-overview-data"
import type { OverviewFilters }            from "@/components/new-dashboard/use-overview-data"

// ─── Inner content (rendered inside LayoutWrapper) ────────────────────────────

function DashboardContent() {
  const [filters, setFilters] = useState<OverviewFilters>(defaultFilters)
  const [activeTab, setActiveTab] = useState("overview")

  const handleFilterChange = useCallback((next: OverviewFilters) => {
    setFilters(next)
  }, [])

  const { summary, trends, expDist, incDist, petty } = useOverviewData(filters)

  return (
    <div className="space-y-6">

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your financial overview at a glance
            </p>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────────────────── */}
        <DateRangeFilter filters={filters} onChange={handleFilterChange} />

        {/* ── Summary cards ─────────────────────────────────────────────────── */}
        <SummaryCards data={summary.data} loading={summary.loading} />

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="h-10 rounded-xl border bg-muted/40 p-1 gap-0.5">
            <TabsTrigger value="overview" className="rounded-lg px-4 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg px-4 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <TrendingUp className="h-3.5 w-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="loans" className="rounded-lg px-4 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Landmark className="h-3.5 w-3.5" />
              Loans
            </TabsTrigger>
            <TabsTrigger value="savings" className="rounded-lg px-4 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <PiggyBank className="h-3.5 w-3.5" />
              Savings
            </TabsTrigger>
            <TabsTrigger value="goals" className="rounded-lg px-4 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Target className="h-3.5 w-3.5" />
              Goals
            </TabsTrigger>
          </TabsList>

          {/* ── Overview tab ────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-5 mt-0">
            {/* Row 1 — trends (full width) */}
            <TrendsChart
              data={trends.data?.data ?? []}
              loading={trends.loading}
            />

            {/* Row 2 — distribution donut + petty cash */}
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
          </TabsContent>

          {/* ── Analytics tab ───────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="mt-0">
            <FreelancingAnalytics ownerType={filters.ownerType || undefined} />
          </TabsContent>

          {/* ── Loans tab ───────────────────────────────────────────────────── */}
          <TabsContent value="loans" className="mt-0">
            <LoansTab />
          </TabsContent>

          {/* ── Savings tab ─────────────────────────────────────────────────── */}
          <TabsContent value="savings" className="mt-0">
            <SavingsTab />
          </TabsContent>

          {/* ── Goals tab ───────────────────────────────────────────────────── */}
          <TabsContent value="goals" className="mt-0">
            <GoalsTab />
          </TabsContent>
        </Tabs>
    </div>
  )
}

// ─── Page (with auth guard + layout) ─────────────────────────────────────────

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
