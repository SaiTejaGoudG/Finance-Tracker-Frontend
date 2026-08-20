"use client"

/**
 * Month picker with prev/next stepping.
 *
 * Stepping one month at a time is by far the commonest action ("what about
 * last month?"), so it gets dedicated ‹ › buttons instead of costing a
 * popover open + grid hunt every time. The popover stays for jumping
 * further afield (different month, different year).
 *
 * Prefer the CONTROLLED form — pass `value` and treat `onMonthSelect` as
 * the only writer. The uncontrolled form (`defaultMonth`) is kept for
 * backwards compatibility, but it seeds internal state once and can then
 * drift from the parent, which is how the petty-cash page ended up showing
 * a different month in the picker than the one it was actually filtering by.
 */

import { useState } from "react"
import { format, addMonths, subMonths, startOfMonth } from "date-fns"
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type MonthCalendarProps = {
  onMonthSelect: (date: Date) => void
  /** Controlled value. When provided, this is the source of truth. */
  value?: Date
  /** Uncontrolled initial value. Ignored when `value` is set. */
  defaultMonth?: Date
  /** Latest month that can be selected. Defaults to no limit. */
  maxMonth?: Date
}

export default function MonthCalendar({
  onMonthSelect,
  value,
  defaultMonth,
  maxMonth,
}: MonthCalendarProps) {
  const [internalMonth, setInternalMonth] = useState<Date>(defaultMonth || new Date())
  const selectedMonth = value ?? internalMonth

  const [selectedYear, setSelectedYear] = useState<number>(selectedMonth.getFullYear())
  const [isOpen, setIsOpen] = useState(false)

  // The year shown in the popover follows the selected month whenever the
  // popover is (re)opened, so stepping across a year boundary with the
  // arrows doesn't leave the grid parked on the old year.
  const handleOpenChange = (next: boolean) => {
    if (next) setSelectedYear(selectedMonth.getFullYear())
    setIsOpen(next)
  }

  const commit = (next: Date) => {
    const normalized = startOfMonth(next)
    if (value === undefined) setInternalMonth(normalized)
    onMonthSelect(normalized)
  }

  const handleMonthClick = (monthIndex: number) => {
    commit(new Date(selectedYear, monthIndex, 1))
    setIsOpen(false)
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const currentDate = new Date()
  const isCurrentMonth = (monthIndex: number) =>
    selectedYear === currentDate.getFullYear() && monthIndex === currentDate.getMonth()
  const isSelectedMonth = (monthIndex: number) =>
    selectedYear === selectedMonth.getFullYear() && monthIndex === selectedMonth.getMonth()

  const cap = maxMonth ? startOfMonth(maxMonth) : null
  const nextDisabled = cap ? startOfMonth(addMonths(selectedMonth, 1)) > cap : false
  const monthBeyondCap = (monthIndex: number) =>
    cap ? new Date(selectedYear, monthIndex, 1) > cap : false

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        aria-label="Previous month"
        onClick={() => commit(subMonths(selectedMonth, 1))}
        className="h-8 w-8 shrink-0 bg-transparent p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-8 min-w-[100px] justify-between bg-transparent px-3 text-sm font-normal"
          >
            {format(selectedMonth, "MMM yyyy")}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-3">
            {/* Year stepper */}
            <div className="mb-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Previous year"
                onClick={() => setSelectedYear((prev) => prev - 1)}
                className="h-6 w-6 p-0"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <div className="text-sm font-semibold">{selectedYear}</div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Next year"
                onClick={() => setSelectedYear((prev) => prev + 1)}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-1">
              {months.map((month, index) => (
                <Button
                  key={month}
                  variant={isSelectedMonth(index) ? "default" : "ghost"}
                  size="sm"
                  disabled={monthBeyondCap(index)}
                  onClick={() => handleMonthClick(index)}
                  className={cn(
                    "h-8 text-xs font-normal",
                    isSelectedMonth(index) && "bg-primary text-primary-foreground hover:bg-primary/90",
                    isCurrentMonth(index) &&
                      !isSelectedMonth(index) &&
                      "bg-info-subtle text-info-text border border-info/25",
                  )}
                >
                  {month}
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        aria-label="Next month"
        disabled={nextDisabled}
        onClick={() => commit(addMonths(selectedMonth, 1))}
        className="h-8 w-8 shrink-0 bg-transparent p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
