"use client"

import AppShell from "@/components/app-shell"
import AnalyticsNav from "@/components/analytics-nav"
import { useFilters } from "@/context/FiltersContext"
import OwnerComparison from "@/components/new-dashboard/analytics/owner-comparison"

function Content() {
  const { filters } = useFilters()
  return (
    <div className="space-y-5">
      <OwnerComparison filters={filters} />
    </div>
  )
}

export default function Page() {
  return (
    <AppShell
      title="By owner"
      description="Compare income and spend across owners"
      showFilters
      subNav={<AnalyticsNav />}
    >
      <Content />
    </AppShell>
  )
}
