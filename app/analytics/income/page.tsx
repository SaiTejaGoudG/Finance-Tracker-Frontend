"use client"

import AppShell from "@/components/app-shell"
import AnalyticsNav from "@/components/analytics-nav"
import { useFilters } from "@/context/FiltersContext"
import IncomeAnalytics from "@/components/new-dashboard/analytics/income-analytics"

function Content() {
  const { filters } = useFilters()
  return (
    <div className="space-y-5">
      <IncomeAnalytics filters={filters} />
    </div>
  )
}

export default function Page() {
  return (
    <AppShell
      title="Income analytics"
      description="Where your money comes from, month by month"
      showFilters
      subNav={<AnalyticsNav />}
    >
      <Content />
    </AppShell>
  )
}
