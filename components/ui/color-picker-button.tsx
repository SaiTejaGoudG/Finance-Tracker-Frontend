"use client"

/**
 * Reusable color-swatch picker: a trigger button showing the current (or
 * fallback default) color, a popover grid of preset swatches, plus a native
 * <input type="color"> and a free-text hex field for anything else. Shared
 * by the category emoji/color editor (Configurations -> Categories) and the
 * credit card label color editor (Configurations -> Credit Cards) so both
 * pick from a consistent palette and behave identically.
 */

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const isHex6 = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)

export function ColorPickerButton({
  value,
  onChange,
  choices,
  disabled,
  fallbackColor,
  label = "Pick a color",
}: {
  /** Current hex value, or "" if no override is set (falls back to fallbackColor). */
  value: string
  onChange: (color: string) => void
  /** Preset swatches shown in the popover grid. */
  choices: string[]
  disabled?: boolean
  /** Swatch shown on the trigger button and the custom-color input when value is empty. */
  fallbackColor: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const swatch = value || fallbackColor

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md border bg-card transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={value ? `Color: ${value}. Click to change.` : "Choose a color"}
        >
          <span
            className="h-6 w-6 rounded-full border"
            style={{ backgroundColor: swatch }}
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Use default
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {choices.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c)
                setOpen(false)
              }}
              aria-label={`Choose ${c}`}
              style={{ backgroundColor: c }}
              className={cn(
                "h-8 w-8 shrink-0 rounded-full border transition-transform hover:scale-105",
                value === c && "ring-2 ring-primary ring-offset-1 ring-offset-popover",
              )}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <input
            type="color"
            aria-label="Custom color"
            value={isHex6(swatch) ? swatch : "#9ca3af"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 shrink-0 cursor-pointer rounded border bg-transparent p-0"
          />
          <Input
            value={value}
            placeholder="#22c55e"
            maxLength={9}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 flex-1 font-mono text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
