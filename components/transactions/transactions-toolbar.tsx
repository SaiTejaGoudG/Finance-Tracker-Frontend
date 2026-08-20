"use client"

/**
 * Toolbar for the All Transactions table: search, filters, active filter chips,
 * density toggle, and the row-selection action bar.
 */

import { useEffect, useState } from "react"
import { Search, X, Rows3, Rows2, ListFilter, CalendarRange } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MultiSelect } from "@/components/ui/multi-select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type Density = "comfortable" | "compact"

// ─── Date range filter ────────────────────────────────────────────────────────
// Additive to the month/year navigator elsewhere on the page — when set, this
// exact span of days is what's actually sent to the backend instead of the
// whole selected month.

/**
 * Exported so other screens with a date-range filter (the Business ledger)
 * reuse this exact control instead of growing a second, slightly-different
 * range picker. Note there's also components/new-dashboard/date-range-filter
 * — that one drives the shared URL filters context, not a local DateRange.
 */
export function DateRangeFilter({
  range,
  onRangeChange,
  disabled,
}: {
  range?: DateRange
  onRangeChange: (r: DateRange | undefined) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(range)

  // Re-sync the in-popover draft whenever the applied range changes
  // elsewhere (e.g. cleared via the filter chip).
  useEffect(() => {
    if (!open) setDraft(range)
  }, [range, open])

  const label =
    range?.from && range?.to
      ? `${format(range.from, "d MMM")} – ${format(range.to, "d MMM")}`
      : range?.from
        ? `${format(range.from, "d MMM")} – …`
        : "All dates"

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setDraft(range)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start gap-2 text-left font-normal sm:w-48",
            !range?.from && "text-muted-foreground",
          )}
        >
          <CalendarRange className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={draft}
          onSelect={setDraft}
          numberOfMonths={2}
          defaultMonth={draft?.from}
        />
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(undefined)
              onRangeChange(undefined)
              setOpen(false)
            }}
          >
            Clear
          </Button>
          <Button
            size="sm"
            disabled={!draft?.from || !draft?.to}
            onClick={() => {
              onRangeChange(draft)
              setOpen(false)
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Active filter chip ───────────────────────────────────────────────────────

function FilterChip({
  label,
  value,
  onClear,
}: {
  label: string
  value: string
  onClear: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 py-1 pl-2.5 pr-1 text-xs animate-scale-in">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
      <button
        onClick={onClear}
        aria-label={`Clear ${label} filter`}
        className="ml-0.5 grid h-4 w-4 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

// ─── Density toggle ───────────────────────────────────────────────────────────

function DensityToggle({
  density,
  onChange,
}: {
  density: Density
  onChange: (d: Density) => void
}) {
  const next = density === "comfortable" ? "compact" : "comfortable"
  const Icon = density === "comfortable" ? Rows2 : Rows3
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => onChange(next)}
            aria-label={`Switch to ${next} row height`}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {density === "comfortable" ? "Compact rows" : "Comfortable rows"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function fmtINR(n: number) {
  return `₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  searchTerm: string
  onSearchChange: (v: string) => void

  selectedCategories: string[]
  onCategoriesChange: (v: string[]) => void
  categories: string[]

  showCardFilter?: boolean
  selectedCards?: string[]
  onCardsChange?: (v: string[]) => void
  cards?: string[]

  showOwnerFilter?: boolean
  selectedOwners?: string[]
  onOwnersChange?: (v: string[]) => void
  owners?: string[]

  showDateFilter?: boolean
  dateRange?: DateRange
  onDateRangeChange?: (r: DateRange | undefined) => void

  density: Density
  onDensityChange: (d: Density) => void

  resultCount: number
  totalCount: number
  disabled?: boolean

  /**
   * Totals for whatever is currently visible in the table — computed from
   * the same filtered+sorted list the table renders, so this tracks search,
   * category and card filters automatically rather than a separate,
   * possibly-stale server-side figure.
   */
  totals?: { inflow: number; outflow: number; net: number; total: number }
  /** true = mixed types (All Transactions), show inflow/outflow/net; false = show a plain total */
  showBreakdown?: boolean
  /**
   * true while the text search box is filtering — `totals` is then a
   * client-side sum of the loaded page rather than the backend's exact,
   * unbounded SUM, so it's labeled as scoped to what's currently shown.
   */
  totalsApproximate?: boolean
}

export default function TransactionsToolbar({
  searchTerm,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  categories,
  showCardFilter,
  selectedCards = [],
  onCardsChange,
  cards = [],
  showOwnerFilter,
  selectedOwners = [],
  onOwnersChange,
  owners = [],
  showDateFilter,
  dateRange,
  onDateRangeChange,
  density,
  onDensityChange,
  resultCount,
  totalCount,
  disabled,
  totals,
  showBreakdown,
  totalsApproximate,
}: ToolbarProps) {
  const hasCategoryFilter = selectedCategories.length > 0
  const hasCardFilter = selectedCards.length > 0
  const hasOwnerFilter = selectedOwners.length > 0
  const hasSearch = searchTerm.trim().length > 0
  const hasDateFilter = Boolean(dateRange?.from && dateRange?.to)
  const activeCount =
    (hasCategoryFilter ? 1 : 0) +
    (hasCardFilter ? 1 : 0) +
    (hasOwnerFilter ? 1 : 0) +
    (hasSearch ? 1 : 0) +
    (hasDateFilter ? 1 : 0)

  const clearAll = () => {
    onSearchChange("")
    onCategoriesChange([])
    onCardsChange?.([])
    onOwnersChange?.([])
    onDateRangeChange?.(undefined)
  }

  return (
    <div className="space-y-3 border-b px-4 py-3">
      {/* Row 1 — search + selects + density */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Search by description or category…"
            className="h-9 pl-9 pr-9"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabled}
            aria-label="Search transactions"
          />
          {hasSearch && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-full sm:w-44">
            <MultiSelect
              values={selectedCategories}
              onValuesChange={onCategoriesChange}
              disabled={disabled}
              placeholder="All categories"
              searchPlaceholder="Search category…"
              options={categories.map((c) => ({ value: c, label: c }))}
            />
          </div>

          {showCardFilter && cards.length > 0 && (
            <div className="w-full sm:w-44">
              <MultiSelect
                values={selectedCards}
                onValuesChange={(v) => onCardsChange?.(v)}
                disabled={disabled}
                placeholder="All cards"
                searchPlaceholder="Search card…"
                options={cards.map((c) => ({ value: c, label: c }))}
              />
            </div>
          )}

          {showOwnerFilter && owners.length > 0 && (
            <div className="w-full sm:w-40">
              <MultiSelect
                values={selectedOwners}
                onValuesChange={(v) => onOwnersChange?.(v)}
                disabled={disabled}
                placeholder="All owners"
                searchPlaceholder="Search owner…"
                options={owners.map((o) => ({
                  value: o,
                  // Stored lowercase ('self', 'brother'); title-case for display.
                  label: o.charAt(0).toUpperCase() + o.slice(1),
                }))}
              />
            </div>
          )}

          {showDateFilter && (
            <DateRangeFilter
              range={dateRange}
              onRangeChange={(r) => onDateRangeChange?.(r)}
              disabled={disabled}
            />
          )}

          <DensityToggle density={density} onChange={onDensityChange} />
        </div>
      </div>

      {/* Row 2 — result count + active filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="tnum font-medium text-foreground">{resultCount}</span>
          {activeCount > 0 ? (
            <>
              of <span className="tnum">{totalCount}</span>
            </>
          ) : null}
          {resultCount === 1 ? "transaction" : "transactions"}
        </span>

        {totals && resultCount > 0 && (
          <>
            <span className="text-border" aria-hidden="true">
              |
            </span>
            {showBreakdown ? (
              <span className="inline-flex items-center gap-2 text-xs">
                {totals.inflow > 0 && (
                  <span className="tnum text-success-text">+{fmtINR(totals.inflow)}</span>
                )}
                {totals.outflow > 0 && (
                  <span className="tnum text-muted-foreground">−{fmtINR(totals.outflow)}</span>
                )}
                <span
                  className={cn(
                    "tnum font-semibold",
                    totals.net >= 0 ? "text-success-text" : "text-foreground",
                  )}
                >
                  Net {totals.net >= 0 ? "+" : "−"}
                  {fmtINR(totals.net)}
                </span>
              </span>
            ) : (
              <span className="tnum text-xs font-semibold text-foreground">
                Total {fmtINR(totals.total)}
              </span>
            )}
            {totalsApproximate && (
              <span className="text-xs text-muted-foreground" title="Search narrows this to only the rows currently loaded, not a database-wide total">
                (of loaded results)
              </span>
            )}
          </>
        )}

        {activeCount > 0 && (
          <>
            <span className="text-border" aria-hidden="true">
              |
            </span>

            {hasSearch && (
              <FilterChip
                label="Search"
                value={`"${searchTerm}"`}
                onClear={() => onSearchChange("")}
              />
            )}
            {selectedCategories.map((c) => (
              <FilterChip
                key={`cat-${c}`}
                label="Category"
                value={c}
                onClear={() => onCategoriesChange(selectedCategories.filter((x) => x !== c))}
              />
            ))}
            {selectedCards.map((c) => (
              <FilterChip
                key={`card-${c}`}
                label="Card"
                value={c}
                onClear={() => onCardsChange?.(selectedCards.filter((x) => x !== c))}
              />
            ))}
            {selectedOwners.map((o) => (
              <FilterChip
                key={`owner-${o}`}
                label="Owner"
                value={o.charAt(0).toUpperCase() + o.slice(1)}
                onClear={() => onOwnersChange?.(selectedOwners.filter((x) => x !== o))}
              />
            ))}
            {hasDateFilter && dateRange?.from && dateRange?.to && (
              <FilterChip
                label="Date"
                value={`${format(dateRange.from, "d MMM")} – ${format(dateRange.to, "d MMM")}`}
                onClear={() => onDateRangeChange?.(undefined)}
              />
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Bulk selection action bar ────────────────────────────────────────────────

export function BulkActionBar({
  count,
  onClear,
  actions,
  className,
}: {
  count: number
  onClear: () => void
  actions: React.ReactNode
  className?: string
}) {
  if (count === 0) return null
  return (
    <div
      role="region"
      aria-label={`${count} transactions selected`}
      className={cn(
        "flex flex-wrap items-center gap-3 border-b bg-primary px-4 py-2.5 text-primary-foreground animate-slide-up",
        className,
      )}
    >
      <span className="text-sm font-medium">
        <span className="tnum">{count}</span> selected
      </span>
      <div className="ml-auto flex items-center gap-2">
        {actions}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
