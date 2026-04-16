"use client"

import { useState } from "react"
import { format, addMonths, subMonths } from "date-fns"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import MonthCalendar from "@/components/month-calendar"

type MonthSelectorProps = {
  onMonthSelect: (month: Date) => void
  defaultMonth?: Date
}

export default function MonthSelector({ onMonthSelect, defaultMonth }: MonthSelectorProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(defaultMonth || new Date())
  const [isOpen, setIsOpen] = useState(false)

  const handlePreviousMonth = () => {
    const newMonth = subMonths(selectedMonth, 1)
    setSelectedMonth(newMonth)
    onMonthSelect(newMonth)
  }

  const handleNextMonth = () => {
    const newMonth = addMonths(selectedMonth, 1)
    setSelectedMonth(newMonth)
    onMonthSelect(newMonth)
  }

  const handleMonthSelect = (month: Date) => {
    setSelectedMonth(month)
    onMonthSelect(month)
    setIsOpen(false)
  }

  return (
    <div className="flex items-center space-x-1">
      <Button variant="outline" size="sm" onClick={handlePreviousMonth} className="h-8 w-8 p-0 bg-transparent">
        <ChevronLeft className="h-3 w-3" />
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 px-3 justify-start bg-transparent text-sm">
            <Calendar className="mr-2 h-3 w-3" />
            {format(selectedMonth, "MMMM yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <MonthCalendar onMonthSelect={handleMonthSelect} defaultMonth={selectedMonth} />
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0 bg-transparent">
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  )
}
