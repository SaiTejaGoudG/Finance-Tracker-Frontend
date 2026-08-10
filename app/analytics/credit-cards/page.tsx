"use client"

import AppShell from "@/components/app-shell"
import AnalyticsNav from "@/components/analytics-nav"
import { useFilters } from "@/context/FiltersContext"
import CreditCardAnalytics from "@/components/new-dashboard/credit-card-analytics"
import { useCreditCardAnalytics } from "@/components/new-dashboard/use-overview-data"

function Content() {
  const { filters } = useFilters()
  // Only this route fetches the credit-card endpoint now
  const cc = useCreditCardAnalytics(filters)

  return (
    <div className="space-y-5">
      <CreditCardAnalytics data={cc.data} loading={cc.loading} />
    </div>
  )
}

export default function Page() {
  return (
    <AppShell
      title="Credit card analytics"
      description="Spend per card by transaction date, with monthly history"
      showFilters
      subNav={<AnalyticsNav />}
    >
      <Content />
    </AppShell>
  )
}
