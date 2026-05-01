"use client"

/**
 * SearchableSelect – a Popover + Command combobox that replaces shadcn Select
 * wherever the option list is long enough to benefit from a search input.
 *
 * API mirrors shadcn Select as closely as possible:
 *   <SearchableSelect
 *     value={value}
 *     onValueChange={(v) => setValue(v)}
 *     placeholder="Pick one…"
 *     options={[{ value: "a", label: "Apple", icon: <span>🍎</span> }]}
 *   />
 */

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface SearchableSelectOption {
  value: string
  label: string
  /** Optional leading icon/emoji rendered inside the option row and trigger */
  icon?: React.ReactNode
}

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  /** Width class applied to the PopoverContent (defaults to w-[var(--radix-popover-trigger-width)]) */
  contentClassName?: string
  className?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  disabled = false,
  contentClassName,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((opt) => opt.value === value)

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
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate min-w-0">
            {selected?.icon && (
              <span className="shrink-0">{selected.icon}</span>
            )}
            <span className="truncate">
              {selected ? selected.label : placeholder}
            </span>
          </span>
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
          <CommandInput placeholder={searchPlaceholder} autoFocus />
          <CommandList
            className="max-h-60 overflow-y-scroll overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onValueChange(opt.value)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span>{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
