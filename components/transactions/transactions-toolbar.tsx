"use client"

/**
 * Toolbar for the All Transactions table: search, filters, active filter chips,
 * density toggle, and the row-selection action bar.
 */

import { Search, X, Rows3, Rows2, ListFilter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type Density = "comfortable" | "compact"

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

// ─── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  searchTerm: string
  onSearchChange: (v: string) => void

  selectedCategory: string
  onCategoryChange: (v: string) => void
  categories: string[]

  showCardFilter?: boolean
  selectedCard?: string | null
  onCardChange?: (v: string | null) => void
  cards?: string[]

  density: Density
  onDensityChange: (d: Density) => void

  resultCount: number
  totalCount: number
  disabled?: boolean
}

export default function TransactionsToolbar({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  showCardFilter,
  selectedCard,
  onCardChange,
  cards = [],
  density,
  onDensityChange,
  resultCount,
  totalCount,
  disabled,
}: ToolbarProps) {
  const hasCategoryFilter = selectedCategory && selectedCategory !== "All"
  const hasCardFilter = Boolean(selectedCard)
  const hasSearch = searchTerm.trim().length > 0
  const activeCount =
    (hasCategoryFilter ? 1 : 0) + (hasCardFilter ? 1 : 0) + (hasSearch ? 1 : 0)

  const clearAll = () => {
    onSearchChange("")
    onCategoryChange("All")
    onCardChange?.(null)
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
            <SearchableSelect
              value={selectedCategory}
              onValueChange={onCategoryChange}
              disabled={disabled}
              placeholder="All categories"
              searchPlaceholder="Search category…"
              options={categories.map((c) => ({ value: c, label: c }))}
            />
          </div>

          {showCardFilter && cards.length > 0 && (
            <div className="w-full sm:w-44">
              <SearchableSelect
                value={selectedCard || "all"}
                onValueChange={(v) => onCardChange?.(v === "all" ? null : v)}
                disabled={disabled}
                placeholder="All cards"
                searchPlaceholder="Search card…"
                options={[
                  { value: "all", label: "All Cards" },
                  ...cards.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
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
            {hasCategoryFilter && (
              <FilterChip
                label="Category"
                value={selectedCategory}
                onClear={() => onCategoryChange("All")}
              />
            )}
            {hasCardFilter && (
              <FilterChip
                label="Card"
                value={selectedCard!}
                onClear={() => onCardChange?.(null)}
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
