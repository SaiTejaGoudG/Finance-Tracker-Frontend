"use client"

/**
 * Manage custom categories, grouped by transaction type.
 *
 * Only the user's own additions appear here — the built-in list is fixed and
 * lives in lib/data.ts. Removing a custom category does NOT alter transactions
 * already using it: category is stored on the transaction as free text, so the
 * historical label survives. It simply stops being offered in new dropdowns.
 */

import { useState } from "react"
import { Plus, Trash2, Tag, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { EmptyState, SkeletonRows, ErrorBanner } from "@/components/ui/states"
import { getCategoryMeta } from "@/lib/tx-meta"
import { cn } from "@/lib/utils"
import {
  useAllCustomCategories,
  type CategoryType,
} from "@/hooks/use-categories"

const TYPES: CategoryType[] = [
  "Income",
  "Expense",
  "Investment",
  "Asset",
  "Credit Card",
  "Petty Cash",
]

export default function CategoriesManager() {
  const { toast } = useToast()
  const { custom, loading, error, refetch, create, remove } = useAllCustomCategories()

  const [name, setName] = useState("")
  const [types, setTypes] = useState<CategoryType[]>([])
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const toggleType = (t: CategoryType) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed || types.length === 0) return

    setSaving(true)
    try {
      const { createdTypes, existingTypes } = await create(trimmed, types)

      if (createdTypes.length === 0) {
        toast({
          title: "Already exists",
          description: `"${trimmed}" already exists for the selected transaction type(s).`,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Category added",
        description:
          existingTypes.length > 0
            ? `"${trimmed}" added for ${createdTypes.join(", ")}. It already existed for ${existingTypes.join(", ")}.`
            : `"${trimmed}" is now available for ${createdTypes.join(", ")}.`,
      })
      setName("")
      setTypes([])
    } catch (e) {
      toast({
        title: "Couldn't add category",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: number, label: string) => {
    setRemovingId(id)
    try {
      await remove(id)
      toast({
        title: "Category removed",
        description: `"${label}" won't be offered for new transactions. Existing ones keep their category.`,
      })
    } catch (e) {
      toast({
        title: "Couldn't remove category",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRemovingId(null)
    }
  }

  const grouped = TYPES.map((t) => ({
    type: t,
    items: custom.filter((c) => c.transaction_type === t),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-category" className="text-xs font-medium">
              Category name
            </Label>
            <Input
              id="new-category"
              placeholder="e.g. Airbnb"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              disabled={saving}
            />
          </div>

          <Button onClick={handleAdd} disabled={saving || !name.trim() || types.length === 0}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            Add
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Transaction types{" "}
            <span className="font-normal text-muted-foreground">(select all that apply)</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => {
              const active = types.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  disabled={saving}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent",
                  )}
                >
                  {active && <Check className="h-3.5 w-3.5" />}
                  {t}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Existing custom categories */}
      {loading ? (
        <SkeletonRows rows={3} columns={3} />
      ) : grouped.length === 0 ? (
        <EmptyState
          compact
          icon={Tag}
          title="No custom categories yet"
          description="Add one above, or type a new category directly in the transaction form."
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(({ type: t, items }) => (
            <div key={t} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((c) => {
                  const { emoji, color } = getCategoryMeta(c.name)
                  const busy = removingId === c.id
                  return (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pl-1.5 pr-1 text-sm"
                    >
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs select-none"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      >
                        {emoji}
                      </span>
                      <span className="text-foreground">{c.name}</span>
                      <button
                        onClick={() => handleRemove(c.id, c.name)}
                        disabled={busy}
                        aria-label={`Remove ${c.name}`}
                        className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive-subtle hover:text-destructive-text disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
