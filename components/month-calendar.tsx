"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type MonthCalendarProps = {
  onMonthSelect: (date: Date) => void
  defaultMonth?: Date
}

export default function MonthCalendar({ onMonthSelect, defaultMonth }: MonthCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(defaultMonth || new Date())
  const [selectedYear, setSelectedYear] = useState<number>(selectedMonth.getFullYear())
  const [isOpen, setIsOpen] = useState(false)
  const [showYearSelector, setShowYearSelector] = useState(false)

  const handleMonthClick = (monthIndex: number) => {
    const newDate = new Date(selectedYear, monthIndex, 1)
    setSelectedMonth(newDate)
    onMonthSelect(newDate)
    setIsOpen(false)
    setShowYearSelector(false)
  }

  const handleYearChange = (increment: number) => {
    setSelectedYear((prev) => prev + increment)
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const currentDate = new Date()
  const isCurrentMonth = (monthIndex: number) => {
    return selectedYear === currentDate.getFullYear() && monthIndex === currentDate.getMonth()
  }

  const isSelectedMonth = (monthIndex: number) => {
    return selectedYear === selectedMonth.getFullYear() && monthIndex === selectedMonth.getMonth()
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-8 px-3 text-sm font-normal justify-between min-w-[100px] bg-transparent"
          >
            {format(selectedMonth, "MMM yyyy")}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-3">
            {/* Year Selector */}
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="sm" onClick={() => handleYearChange(-1)} className="h-6 w-6 p-0">
                <ChevronUp className="h-3 w-3" />
              </Button>
              <div className="text-sm font-semibold">{selectedYear}</div>
              <Button variant="ghost" size="sm" onClick={() => handleYearChange(1)} className="h-6 w-6 p-0">
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-3 gap-1">
              {months.map((month, index) => (
                <Button
                  key={month}
                  variant={isSelectedMonth(index) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleMonthClick(index)}
                  className={cn(
                    "h-8 text-xs font-normal",
                    isSelectedMonth(index) && "bg-black text-white hover:bg-gray-800",
                    isCurrentMonth(index) && !isSelectedMonth(index) && "bg-blue-50 text-blue-600 border-blue-200",
                  )}
                >
                  {month}
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
