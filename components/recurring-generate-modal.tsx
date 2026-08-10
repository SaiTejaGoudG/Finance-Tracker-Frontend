"use client"

import { useState, useEffect } from "react"
import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState, ErrorBanner, SkeletonRows } from "@/components/ui/states"
import {
  CheckCircle2, XCircle, Clock, AlertTriangle,
  Zap, SkipForward, RefreshCw, ChevronLeft, ChevronRight
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "pending" | "generated" | "skipped" | "updated_since_generated"

type PreviewItem = {
  id: number
  description: string
  amount: number
  category: string | null
  transaction_type: string
  day_of_month: number
  active: boolean
  status: Status
  generated_amount: number | null  // what was used last time (if any)
  log: { transaction_id: number | null; generated_at: string } | null
}

type ItemState = {
  include: boolean              // true = generate, false = skip
  amount_override: number       // what amount to use (defaults to template amount)
  description_override: string  // what name to save the transaction under
  force_update: boolean         // for updated_since_generated: also update the existing txn
}

type GenerateResult = {
  created: { description: string; amount: number; txn_date: string }[]
  updated: { description: string; amount: number }[]
  skipped: { description: string }[]
  errors:  { id: number; reason: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<Status, { label: string; icon: React.ReactNode; color: string }> = {
  pending: {
    label: "Pending",
    icon: <Clock className="h-4 w-4" />,
    color: "text-warning-subtle-foreground bg-warning-subtle border-warning/25",
  },
  generated: {
    label: "Done",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-success-subtle-foreground bg-success-subtle border-success/25",
  },
  skipped: {
    label: "Skipped",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-muted-foreground bg-muted border-border",
  },
  updated_since_generated: {
    label: "Template updated",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-warning-subtle-foreground bg-warning-subtle border-warning/25",
  },
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const fmt = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  open: boolean
  onClose: () => void
  month: number
  year: number
  onGenerated?: () => void   // callback to refresh the transactions list
}

export default function RecurringGenerateModal({ open, onClose, month, year, onGenerated }: Props) {
  const { toast } = useToast()
  const [items, setItems] = useState<PreviewItem[]>([])
  const [states, setStates] = useState<Record<number, ItemState>>({})
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)

  // Internal month/year — defaults to the prop value but user can navigate freely
  const [selMonth, setSelMonth] = useState(month)
  const [selYear, setSelYear]   = useState(year)

  // Sync internal selection when props change (e.g. user switches month on the
  // transactions page and re-opens the modal)
  useEffect(() => {
    setSelMonth(month)
    setSelYear(year)
  }, [month, year])

  // ── Month navigation ─────────────────────────────────────────────────────
  const goToPrev = () => {
    if (selMonth === 1) { setSelMonth(12); setSelYear((y) => y - 1) }
    else setSelMonth((m) => m - 1)
  }
  const goToNext = () => {
    if (selMonth === 12) { setSelMonth(1); setSelYear((y) => y + 1) }
    else setSelMonth((m) => m + 1)
  }

  // ── Load preview when modal opens or selected month changes ──────────────
  useEffect(() => {
    if (!open) { setResult(null); return }
    loadPreview()
  }, [open, selMonth, selYear])

  const loadPreview = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res  = await apiClient(apiUrl("recurring/preview", { month: selMonth, year: selYear }))
      const json = await res.json()
      const data: PreviewItem[] = json.data || []
      setItems(data)

      // Initialise per-item state
      const init: Record<number, ItemState> = {}
      for (const item of data) {
        init[item.id] = {
          // Include by default only if pending or skipped (not already done)
          include:              item.status === "pending" || item.status === "skipped" || item.status === "updated_since_generated",
          amount_override:      item.amount,
          description_override: item.description,
          force_update:         false,
        }
      }
      setStates(init)
    } catch {
      toast({ title: "Failed to load preview", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const setState = (id: number, patch: Partial<ItemState>) =>
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  // ── Pending items = items that will actually do something ─────────────────
  const actionableItems = items.filter((item) => {
    const s = states[item.id]
    if (!s) return false
    if (item.status === "generated" && !s.force_update) return false // already done, nothing to do
    return true
  })

  const pendingCount = actionableItems.filter((i) => states[i.id]?.include).length
  const skipCount    = actionableItems.filter((i) => !states[i.id]?.include).length

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const payload = actionableItems
      .filter((item) => {
        const s = states[item.id]
        // For "generated" items, only include if force_update is set
        if (item.status === "generated" && !s?.force_update) return false
        return true
      })
      .map((item) => {
        const s = states[item.id]
        return {
          id:                   item.id,
          skip:                 !s.include,
          amount_override:      s.amount_override !== item.amount ? s.amount_override : undefined,
          description_override: s.description_override !== item.description ? s.description_override : undefined,
          force_update:         s.force_update,
        }
      })

    if (payload.length === 0) {
      toast({ title: "Nothing to generate", description: "All items are already handled for this month." })
      return
    }

    setGenerating(true)
    try {
      const res  = await apiClient(apiUrl("recurring/generate"), {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ month: selMonth, year: selYear, items: payload }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Generate failed")
      setResult(json.data)
      onGenerated?.()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" /> Generate Recurring Transactions
          </DialogTitle>
        </DialogHeader>

        {/* ── Month navigator ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2">
          <button
            onClick={goToPrev}
            className="p-1 rounded hover:bg-background transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-sm">{MONTH_NAMES[selMonth]} {selYear}</p>
            <p className="text-xs text-muted-foreground">Select the month to generate for</p>
          </div>
          <button
            onClick={goToNext}
            className="p-1 rounded hover:bg-background transition-colors"
            title="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {loading && <SkeletonRows rows={4} columns={3} className="rounded-lg border" />}

        {/* ── No templates ─────────────────────────────────────────────── */}
        {!loading && items.length === 0 && !result && (
          <EmptyState
            icon={RefreshCw}
            compact
            title="No active recurring templates found"
            description={'Create templates first from "Manage Recurring".'}
          />
        )}

        {/* ── Result screen ────────────────────────────────────────────── */}
        {result && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">
              Results for {MONTH_NAMES[selMonth]} {selYear}
            </p>
            <div className="rounded-lg border p-4 space-y-3">
              {result.created.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-success-text mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> {result.created.length} transaction(s) created
                  </p>
                  {result.created.map((c, i) => (
                    <div key={i} className="text-sm flex justify-between text-muted-foreground pl-5">
                      <span>{c.description}</span>
                      <span className="tnum">{fmt(c.amount)} · {c.txn_date}</span>
                    </div>
                  ))}
                </div>
              )}
              {result.updated.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-info-text mb-2 flex items-center gap-1">
                    <RefreshCw className="h-4 w-4" /> {result.updated.length} transaction(s) updated
                  </p>
                  {result.updated.map((u, i) => (
                    <div key={i} className="text-sm flex justify-between text-muted-foreground pl-5">
                      <span>{u.description}</span>
                      <span className="tnum">{fmt(u.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {result.skipped.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <SkipForward className="h-4 w-4" /> {result.skipped.length} skipped
                  </p>
                </div>
              )}
              {result.errors.length > 0 && (
                <ErrorBanner
                  message={`${result.errors.length} item(s) failed: ${result.errors
                    .map((e) => e.reason)
                    .join(" · ")}`}
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={loadPreview}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh Preview
              </Button>
              <Button className="flex-1" onClick={onClose}>Done</Button>
            </div>
          </div>
        )}

        {/* ── Preview list ─────────────────────────────────────────────── */}
        {!loading && items.length > 0 && !result && (
          <div className="space-y-3">
            {items.map((item) => {
              const s     = states[item.id]
              const meta  = STATUS_META[item.status]
              const isDone = item.status === "generated" && !s?.force_update
              const isUpdatedWarning = item.status === "updated_since_generated"

              return (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 space-y-2 transition-opacity ${isDone ? "opacity-60" : ""}`}
                >
                  {/* Row 1: checkbox + name + status badge */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={s?.include ?? true}
                      disabled={isDone}
                      onCheckedChange={(v) => setState(item.id, { include: !!v })}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${!s?.include && !isDone ? "line-through text-muted-foreground" : ""}`}>
                          {item.description}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.category && `${item.category} · `}
                        Day {item.day_of_month} of month
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Name + Amount overrides (shown only if item is included and not already-done) */}
                  {s?.include && !isDone && (
                    <div className="pl-7 space-y-2">
                      {/* Description override */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-14 shrink-0">Name:</span>
                        <Input
                          type="text"
                          className="h-8 text-sm flex-1"
                          value={s.description_override}
                          onChange={(e) => setState(item.id, { description_override: e.target.value })}
                          placeholder={item.description}
                        />
                        {s.description_override !== item.description && (
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            onClick={() => setState(item.id, { description_override: item.description })}
                            title="Reset to template name"
                          >
                            ↺
                          </button>
                        )}
                      </div>
                      {/* Amount override */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-14 shrink-0">Amount:</span>
                        <div className="relative max-w-[160px]">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            className="pl-7 h-8 text-sm tnum"
                            value={s.amount_override}
                            onChange={(e) => setState(item.id, { amount_override: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        {s.amount_override !== item.amount && (
                          <span className="text-xs text-muted-foreground tnum">
                            (template: {fmt(item.amount)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Row 3: Updated-since-generated warning + force_update option */}
                  {isUpdatedWarning && (
                    <div className="pl-7 rounded-md bg-warning-subtle border border-warning/25 p-2 space-y-1.5">
                      <p className="text-xs text-warning-subtle-foreground font-medium">
                        ⚠️ Template was updated after this month's transaction was created
                        {item.generated_amount !== null && ` (created with ${fmt(item.generated_amount)})`}.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={s?.force_update ?? false}
                          onCheckedChange={(v) => setState(item.id, { force_update: !!v, include: true })}
                        />
                        <span className="text-xs text-warning-subtle-foreground">
                          Update existing transaction to new amount ({fmt(s?.amount_override ?? item.amount)})
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Row 4: Already generated info row */}
                  {item.status === "generated" && (
                    <div className="pl-7 text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success-text" />
                      <span className="tnum">Generated {fmt(item.generated_amount ?? item.amount)} this month</span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Summary + Generate button */}
            <div className="border-t pt-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pendingCount > 0
                  ? `${pendingCount} transaction${pendingCount > 1 ? "s" : ""} will be created`
                  : "Nothing to generate"}
                {skipCount > 0 && `, ${skipCount} will be skipped`}
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generating || pendingCount === 0}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                {generating ? "Generating…" : "Generate"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
