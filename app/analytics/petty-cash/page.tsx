"use client"

import AppShell from "@/components/app-shell"
import AnalyticsNav from "@/components/analytics-nav"
import { useFilters } from "@/context/FiltersContext"
import PettyCashAnalytics from "@/components/new-dashboard/analytics/petty-cash-analytics"

function Content() {
  const { filters } = useFilters()
  return (
    <div className="space-y-5">
      <PettyCashAnalytics filters={filters} />
    </div>
  )
}

export default function Page() {
  return (
    <AppShell
      title="Petty cash analytics"
      description="Small-cash movement by category and owner"
      showFilters
      subNav={<AnalyticsNav />}
    >
      <Content />
    </AppShell>
  )
}
