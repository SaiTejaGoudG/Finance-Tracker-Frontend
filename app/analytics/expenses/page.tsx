"use client"

import AppShell from "@/components/app-shell"
import AnalyticsNav from "@/components/analytics-nav"
import { useFilters } from "@/context/FiltersContext"
import ExpensesAnalytics from "@/components/new-dashboard/analytics/expenses-analytics"

function Content() {
  const { filters } = useFilters()
  return (
    <div className="space-y-5">
      <ExpensesAnalytics filters={filters} />
    </div>
  )
}

export default function Page() {
  return (
    <AppShell
      title="Expense analytics"
      description="Fixed versus variable spend, and where it goes"
      showFilters
      subNav={<AnalyticsNav />}
    >
      <Content />
    </AppShell>
  )
}
