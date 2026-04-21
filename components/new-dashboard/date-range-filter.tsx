"use client"

import { useState } from "react"
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { OverviewFilters } from "./use-overview-data"

// ─── Preset helpers ────────────────────────────────────────────────────────────

const OWNER_TYPES = [
  { value: "",         label: "All" },
  { value: "self",     label: "Self" },
  { value: "brother",  label: "Brother" },
  { value: "friend",   label: "Friend" },
  { value: "other",    label: "Other" },
]

type PresetKey = "1y" | "6m" | "3m" | "ytd" | "custom"

interface Preset {
  key: PresetKey
  label: string
  getRange: () => { startDate: string; endDate: string }
}

const fmt = (d: Date) => format(d, "yyyy-MM-dd")

const PRESETS: Preset[] = [
  {
    key: "1y",
    label: "Last 1 year",
    getRange: () => ({
      startDate: fmt(startOfMonth(subMonths(new Date(), 11))),
      endDate:   fmt(endOfMonth(new Date())),
    }),
  },
  {
    key: "6m",
    label: "Last 6 months",
    getRange: () => ({
      startDate: fmt(startOfMonth(subMonths(new Date(), 5))),
      endDate:   fmt(endOfMonth(new Date())),
    }),
  },
  {
    key: "3m",
    label: "Last 3 months",
    getRange: () => ({
      startDate: fmt(startOfMonth(subMonths(new Date(), 2))),
      endDate:   fmt(endOfMonth(new Date())),
    }),
  },
  {
    key: "ytd",
    label: "This year",
    getRange: () => ({
      startDate: fmt(startOfYear(new Date())),
      endDate:   fmt(endOfMonth(new Date())),
    }),
  },
  {
    key: "custom",
    label: "Custom",
    getRange: () => ({
      startDate: fmt(startOfMonth(subMonths(new Date(), 11))),
      endDate:   fmt(endOfMonth(new Date())),
    }),
  },
]

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DateRangeFilterProps {
  filters: OverviewFilters
  onChange: (filters: OverviewFilters) => void
  className?: string
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DateRangeFilter({ filters, onChange, className }: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>("1y")
  const [calOpen, setCalOpen]           = useState(false)
  const [ownerOpen, setOwnerOpen]       = useState(false)

  // Custom date pickers (month-level)
  const [customStart, setCustomStart] = useState<Date | undefined>(new Date(filters.startDate))
  const [customEnd,   setCustomEnd]   = useState<Date | undefined>(new Date(filters.endDate))

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.key)
    if (preset.key !== "custom") {
      const range = preset.getRange()
      onChange({ ...filters, startDate: range.startDate, endDate: range.endDate })
    }
  }

  const applyCustom = () => {
    if (!customStart || !customEnd) return
    const sd = fmt(startOfMonth(customStart))
    const ed = fmt(endOfMonth(customEnd))
    onChange({ ...filters, startDate: sd, endDate: ed })
    setCalOpen(false)
  }

  const selectedOwner = OWNER_TYPES.find((o) => o.value === filters.ownerType) ?? OWNER_TYPES[0]

  const displayRange = (() => {
    const s = new Date(filters.startDate)
    const e = new Date(filters.endDate)
    return `${format(s, "MMM yyyy")} – ${format(e, "MMM yyyy")}`
  })()

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Preset pills */}
      <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              applyPreset(p)
              if (p.key === "custom") setCalOpen(true)
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activePreset === p.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range picker */}
      {activePreset === "custom" && (
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              {displayRange}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4 space-y-3" align="start">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Start month</p>
                <Calendar
                  mode="single"
                  selected={customStart}
                  onSelect={setCustomStart}
                  initialFocus
                  toDate={customEnd ?? new Date()}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">End month</p>
                <Calendar
                  mode="single"
                  selected={customEnd}
                  onSelect={setCustomEnd}
                  fromDate={customStart}
                  toDate={new Date()}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t">
              <Button variant="ghost" size="sm" onClick={() => setCalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={applyCustom}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Date range badge when not custom */}
      {activePreset !== "custom" && (
        <div className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{displayRange}</span>
        </div>
      )}

      {/* Owner type selector */}
      <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs ml-auto">
            <span className="text-muted-foreground">Owner:</span>
            <span className="font-medium">{selectedOwner.label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="end">
          {OWNER_TYPES.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange({ ...filters, ownerType: o.value })
                setOwnerOpen(false)
              }}
              className={cn(
                "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors",
                filters.ownerType === o.value
                  ? "bg-accent font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}
