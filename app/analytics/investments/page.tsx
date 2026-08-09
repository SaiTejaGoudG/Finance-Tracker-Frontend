"use client"

import AppShell from "@/components/app-shell"
import AnalyticsNav from "@/components/analytics-nav"
import { useFilters } from "@/context/FiltersContext"
import InvestmentTab from "@/components/new-dashboard/investment-tab"

function Content() {
  const { filters } = useFilters()
  return (
    <div className="space-y-5">
      <InvestmentTab filters={filters} />
    </div>
  )
}

export default function Page() {
  return (
    <AppShell
      title="Investment analytics"
      description="Contributions and growth over the selected period"
      showFilters
      subNav={<AnalyticsNav />}
    >
      <Content />
    </AppShell>
  )
}
