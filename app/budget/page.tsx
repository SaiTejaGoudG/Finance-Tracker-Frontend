"use client"

import AppShell from "@/components/app-shell"
import { useFilters } from "@/context/FiltersContext"
import BudgetTracker from "@/components/new-dashboard/budget-tracker"

function Content() {
  const { filters } = useFilters()
  return <BudgetTracker filters={filters} />
}

export default function Page() {
  return (
    <AppShell title="Budget" description="Set limits per category and track them against actual spend" showFilters>
      <Content />
    </AppShell>
  )
}
