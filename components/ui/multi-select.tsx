"use client"

/**
 * MultiSelect – a Popover + Command combobox for picking any number of
 * options, built as the multi-value sibling of SearchableSelect. Used
 * wherever a filter is "narrow to one or more of X" rather than "pick one
 * value for this field" — e.g. the category/card filters on All
 * Transactions, where selecting Kotak *and* HDFC should show both, not
 * force a choice between them.
 *
 * The popover stays open across selections (closing on every click would
 * make picking three items a three-click-and-reopen chore), and a "Clear"
 * footer appears once anything is selected.
 */

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface MultiSelectOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface MultiSelectProps {
  values: string[]
  onValuesChange: (values: string[]) => void
  options: MultiSelectOption[]
  /** Shown on the trigger when nothing is selected */
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  contentClassName?: string
  className?: string
}

export function MultiSelect({
  values,
  onValuesChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  disabled = false,
  contentClassName,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const toggle = (value: string) => {
    onValuesChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    )
  }

  const selectedLabels = options
    .filter((opt) => values.includes(opt.value))
    .map((opt) => opt.label)

  const triggerText =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? selectedLabels[0]
        : `${values.length} selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10 px-3",
            values.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{triggerText}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 w-[var(--radix-popover-trigger-width)]", contentClassName)}
        align="start"
        sideOffset={4}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            autoFocus
          />
          <CommandList
            className="max-h-60 overflow-y-scroll overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const checked = values.includes(opt.value)
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggle(opt.value)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span>{opt.label}</span>
                    {checked && (
                      <Check className="ml-auto h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          {values.length > 0 && (
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={() => onValuesChange([])}
                className="flex w-full items-center justify-center rounded-sm px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Clear selection ({values.length})
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
