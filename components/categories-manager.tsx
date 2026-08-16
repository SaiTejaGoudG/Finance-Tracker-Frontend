"use client"

/**
 * Manage custom categories, grouped by transaction type.
 *
 * Only the user's own additions appear here — the built-in list is fixed and
 * lives in lib/data.ts. Removing a custom category does NOT alter transactions
 * already using it: category is stored on the transaction as free text, so the
 * historical label survives. It simply stops being offered in new dropdowns.
 */

import { useState, useEffect } from "react"
import { Plus, Trash2, Pencil, Tag, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ColorPickerButton } from "@/components/ui/color-picker-button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { EmptyState, SkeletonRows, ErrorBanner } from "@/components/ui/states"
import { getCategoryMeta, CATEGORY_EMOJI_CHOICES, CATEGORY_COLOR_CHOICES } from "@/lib/tx-meta"
import { cn } from "@/lib/utils"
import {
  useAllCustomCategories,
  type CategoryType,
  type UserCategory,
} from "@/hooks/use-categories"

// ─── Emoji picker (shared by the add form and the edit dialog) ────────────────

function EmojiPickerButton({
  value,
  onChange,
  disabled,
  fallbackFor,
}: {
  value: string
  onChange: (emoji: string) => void
  disabled?: boolean
  fallbackFor: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md border bg-card text-2xl leading-none transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={value ? `Emoji: ${value}. Click to change.` : "Choose an emoji"}
        >
          {value || getCategoryMeta(fallbackFor).emoji}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-medium text-muted-foreground">Pick an emoji</p>
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
        <div className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
          {CATEGORY_EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onChange(e)
                setOpen(false)
              }}
              aria-label={`Choose ${e}`}
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-md text-2xl leading-none transition-colors hover:bg-accent",
                value === e && "bg-primary/15 ring-1 ring-primary",
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Edit dialog ────────────────────────────────────────────────────────────

function EditCategoryDialog({
  category,
  open,
  onOpenChange,
  onSave,
}: {
  category: UserCategory | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    id: number,
    changes: { name?: string; emoji?: string | null; color?: string | null },
  ) => Promise<UserCategory>
}) {
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("")
  const [color, setColor] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (category) {
      setName(category.name)
      setEmoji(category.emoji || "")
      setColor(category.color || "")
    }
  }, [category])

  const handleSave = async () => {
    if (!category) return
    const trimmed = name.trim()
    if (!trimmed) return

    setSaving(true)
    try {
      await onSave(category.id, { name: trimmed, emoji, color })
      toast({ title: "Category updated", description: `"${trimmed}" has been saved.` })
      onOpenChange(false)
    } catch (e) {
      toast({
        title: "Couldn't update category",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Emoji</Label>
              <EmojiPickerButton
                value={emoji}
                onChange={setEmoji}
                disabled={saving}
                fallbackFor={name || category?.name || ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Color</Label>
              <ColorPickerButton
                value={color}
                onChange={setColor}
                disabled={saving}
                choices={CATEGORY_COLOR_CHOICES}
                fallbackColor={getCategoryMeta(name || category?.name || "").color}
                label="Pick an icon color"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="edit-category-name" className="text-xs font-medium">
                Category name
              </Label>
              <Input
                id="edit-category-name"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSave()
                  }
                }}
                disabled={saving}
              />
            </div>
          </div>

          {category && (
            <p className="text-xs text-muted-foreground">
              This only edits the {category.transaction_type} row for "{category.name}". If the
              same name is also offered under another transaction type, edit that one separately.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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
  const { custom, loading, error, refetch, create, update, remove } = useAllCustomCategories()

  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("")
  const [color, setColor] = useState("")
  const [types, setTypes] = useState<CategoryType[]>([])
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const toggleType = (t: CategoryType) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed || types.length === 0) return

    setSaving(true)
    try {
      const { createdTypes, existingTypes } = await create(trimmed, types, emoji, color)

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
      setEmoji("")
      setColor("")
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
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Emoji</Label>
            <EmojiPickerButton
              value={emoji}
              onChange={setEmoji}
              disabled={saving}
              fallbackFor={name.trim()}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Color</Label>
            <ColorPickerButton
              value={color}
              onChange={setColor}
              disabled={saving}
              choices={CATEGORY_COLOR_CHOICES}
              fallbackColor={getCategoryMeta(name.trim()).color}
              label="Pick an icon color"
            />
          </div>

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
        <p className="text-xs text-muted-foreground">
          Click the icons to pick an emoji and icon color — both optional, leave them as-is to use
          the defaults shown.
        </p>

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
                  const meta = getCategoryMeta(c.name)
                  const emoji = c.emoji || meta.emoji
                  const color = c.color || meta.color
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
                        onClick={() => {
                          setEditingCategory(c)
                          setEditDialogOpen(true)
                        }}
                        aria-label={`Edit ${c.name}`}
                        className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
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

      <EditCategoryDialog
        category={editingCategory}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={update}
      />
    </div>
  )
}
