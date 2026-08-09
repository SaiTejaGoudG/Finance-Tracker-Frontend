"use client"

import AppShell from "@/components/app-shell"
import AnalyticsNav from "@/components/analytics-nav"
import { useFilters } from "@/context/FiltersContext"
import FreelancingAnalytics from "@/components/freelancing-analytics"

function Content() {
  const { filters } = useFilters()
  // This component takes ownerType directly rather than the whole filters object
  return (
    <div className="space-y-5">
      <FreelancingAnalytics ownerType={filters.ownerType || undefined} />
    </div>
  )
}

export default function Page() {
  return (
    <AppShell
      title="Freelancing analytics"
      description="Invoices and freelance income over time"
      showFilters
      subNav={<AnalyticsNav />}
    >
      <Content />
    </AppShell>
  )
}
