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

import dynamic from "next/dynamic"
import { SkeletonBlock } from "@/components/ui/states"

import SummaryCards      from "@/components/new-dashboard/summary-cards"
import RecurringPanel    from "@/components/new-dashboard/recurring-panel"

/**
 * Charts are code-split.
 *
 * All five of these pull in recharts (and its d3 dependencies), which was
 * previously bundled into this route's initial JS even though the KPI cards
 * above them are what the user actually reads first — and two of the five sit
 * below the fold. Loading them separately gets the numbers on screen without
 * waiting for the charting library to parse.
 *
 * `ssr: false` because recharts measures the DOM to size itself, so
 * server-rendering it produces markup that's thrown away on hydration anyway.
 * Each gets a skeleton the same height as the chart it replaces, so nothing
 * jumps when it swaps in.
 *
 * NOTE: the options argument must be written inline as an object literal.
 * next/dynamic is a compile-time transform — the bundler reads `ssr`/`loading`
 * statically to decide how to split the chunk — so factoring these into a
 * shared `chartLoader(height)` helper fails the build with
 * "next/dynamic options must be an object literal". Hence the repetition.
 */
const ChartFallback = ({ height }: { height: string }) => (
  <SkeletonBlock className={`w-full ${height} rounded-2xl`} />
)

const TrendsChart = dynamic(() => import("@/components/new-dashboard/trends-chart"), {
  ssr: false,
  loading: () => <ChartFallback height="h-80" />,
})
const DistributionDonut = dynamic(() => import("@/components/new-dashboard/distribution-donut"), {
  ssr: false,
  loading: () => <ChartFallback height="h-80" />,
})
const PettyCashArea = dynamic(() => import("@/components/new-dashboard/petty-cash-area"), {
  ssr: false,
  loading: () => <ChartFallback height="h-72" />,
})
const GapTrendChart = dynamic(() => import("@/components/new-dashboard/gap-trend-chart"), {
  ssr: false,
  loading: () => <ChartFallback height="h-72" />,
})
const YoYChart = dynamic(() => import("@/components/new-dashboard/yoy-chart"), {
  ssr: false,
  loading: () => <ChartFallback height="h-72" />,
})

// Chat is opened on demand and is never part of the first paint.
const AIChatbot = dynamic(() => import("@/components/new-dashboard/ai-chatbot"), { ssr: false })

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
