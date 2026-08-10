"use client"

/**
 * Home.
 *
 * Was an eight-tab shell containing a further seven nested tabs — fifteen
 * targets on one screen, none deep-linkable, and every panel's data fetched on
 * load regardless of what was visible. Those destinations are now real routes
 * (see the sidebar); this page is just the at-a-glance summary.
 */

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import AppShell, { PageHeader, FilterBar } from "@/components/app-shell"
import { useFilters } from "@/context/FiltersContext"

import SummaryCards      from "@/components/new-dashboard/summary-cards"
import TrendsChart       from "@/components/new-dashboard/trends-chart"
import DistributionDonut from "@/components/new-dashboard/distribution-donut"
import PettyCashArea     from "@/components/new-dashboard/petty-cash-area"
import GapTrendChart     from "@/components/new-dashboard/gap-trend-chart"
import YoYChart          from "@/components/new-dashboard/yoy-chart"
import RecurringPanel    from "@/components/new-dashboard/recurring-panel"
import AIChatbot         from "@/components/new-dashboard/ai-chatbot"

import {
  useSummary,
  useTrends,
  useExpenseDistribution,
  useIncomeDistribution,
  usePettyCash,
} from "@/components/new-dashboard/use-overview-data"

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(data: any[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows    = data.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))
  const csv     = [headers.join(","), ...rows].join("\n")
  const blob    = new Blob([csv], { type: "text/csv" })
  const url     = URL.createObjectURL(blob)
  const a       = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Content ──────────────────────────────────────────────────────────────────

function Content() {
  const { filters } = useFilters()

  // Only the five endpoints this page actually renders. The trends result is
  // reused by the header's export button rather than fetched twice.
  const summary = useSummary(filters)
  const trends  = useTrends(filters)
  const expDist = useExpenseDistribution(filters)
  const incDist = useIncomeDistribution(filters)
  const petty   = usePettyCash(filters)

  const trendRows = trends.data?.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Your financial overview at a glance"
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={trends.loading || trendRows.length === 0}
            onClick={() => exportCSV(trendRows, "trends.csv")}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export trends CSV
          </Button>
        }
      />

      <FilterBar />

      <SummaryCards data={summary.data} loading={summary.loading} />

      <TrendsChart data={trends.data?.data ?? []} loading={trends.loading} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <GapTrendChart filters={filters} />
        <YoYChart filters={filters} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

      <RecurringPanel filters={filters} />

      <AIChatbot filters={filters} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// Content owns its header so the export button can reuse the trends data it
// already fetched, instead of firing the request a second time.

export default function DashboardPage() {
  return (
    <AppShell>
      <Content />
    </AppShell>
  )
}
