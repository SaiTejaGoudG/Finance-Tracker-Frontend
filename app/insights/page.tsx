"use client"

import AppShell, { Panel } from "@/components/app-shell"
import { useFilters } from "@/context/FiltersContext"
import AISummaryCard from "@/components/new-dashboard/ai-summary-card"
import AnomalyBanner from "@/components/new-dashboard/anomaly-banner"
import MonthSummaryCard from "@/components/new-dashboard/month-summary-card"
import CategoryTrends from "@/components/new-dashboard/analytics/category-trends"

function Content() {
  const { filters } = useFilters()

  return (
    <div className="space-y-5">
      <AISummaryCard filters={filters} />

      <Panel
        title="Spending spikes"
        description="Months where a category exceeded 1.8× its average spend"
      >
        <AnomalyBanner filters={filters} />
      </Panel>

      <Panel
        title="Category trend"
        description="Pick any category and track its month-by-month spend"
      >
        <CategoryTrends filters={filters} />
      </Panel>

      <MonthSummaryCard filters={filters} />
    </div>
  )
}

export default function Page() {
  return (
    <AppShell
      title="Insights"
      description="Generated summaries, anomalies and month-close notes"
      showFilters
    >
      <Content />
    </AppShell>
  )
}
