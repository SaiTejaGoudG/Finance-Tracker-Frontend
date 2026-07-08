"use client"

import { useState, useEffect } from "react"
import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import {
  CheckCircle2, XCircle, Clock, AlertTriangle,
  Zap, SkipForward, RefreshCw
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
  include: boolean          // true = generate, false = skip
  amount_override: number   // what amount to use (defaults to template amount)
  force_update: boolean     // for updated_since_generated: also update the existing txn
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
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  generated: {
    label: "Done",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-green-600 bg-green-50 border-green-200",
  },
  skipped: {
    label: "Skipped",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-gray-500 bg-gray-50 border-gray-200",
  },
  updated_since_generated: {
    label: "Template updated",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-orange-600 bg-orange-50 border-orange-200",
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

  // ── Load preview when modal opens ────────────────────────────────────────
  useEffect(() => {
    if (!open) { setResult(null); return }
    loadPreview()
  }, [open, month, year])

  const loadPreview = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res  = await apiClient(apiUrl("recurring/preview", { month, year }))
      const json = await res.json()
      const data: PreviewItem[] = json.data || []
      setItems(data)

      // Initialise per-item state
      const init: Record<number, ItemState> = {}
      for (const item of data) {
        init[item.id] = {
          // Include by default only if pending or skipped (not already done)
          include:        item.status === "pending" || item.status === "skipped" || item.status === "updated_since_generated",
          amount_override: item.amount,
          force_update:   false,
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
          id:              item.id,
          skip:            !s.include,
          amount_override: s.amount_override !== item.amount ? s.amount_override : undefined,
          force_update:    s.force_update,
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
        body:    JSON.stringify({ month, year, items: payload }),
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
  const title = `Generate Recurring — ${MONTH_NAMES[month]} ${year}`

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" /> {title}
          </DialogTitle>
        </DialogHeader>

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {loading && (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading preview…</p>
        )}

        {/* ── No templates ─────────────────────────────────────────────── */}
        {!loading && items.length === 0 && !result && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No active recurring templates found.</p>
            <p className="text-xs mt-1">Create templates first from "Manage Recurring".</p>
          </div>
        )}

        {/* ── Result screen ────────────────────────────────────────────── */}
        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              {result.created.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> {result.created.length} transaction(s) created
                  </p>
                  {result.created.map((c, i) => (
                    <div key={i} className="text-sm flex justify-between text-muted-foreground pl-5">
                      <span>{c.description}</span>
                      <span>{fmt(c.amount)} · {c.txn_date}</span>
                    </div>
                  ))}
                </div>
              )}
              {result.updated.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-1">
                    <RefreshCw className="h-4 w-4" /> {result.updated.length} transaction(s) updated
                  </p>
                  {result.updated.map((u, i) => (
                    <div key={i} className="text-sm flex justify-between text-muted-foreground pl-5">
                      <span>{u.description}</span>
                      <span>{fmt(u.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {result.skipped.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <SkipForward className="h-4 w-4" /> {result.skipped.length} skipped
                  </p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-sm text-red-500 pl-5">{e.reason}</p>
                  ))}
                </div>
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

                  {/* Row 2: Amount override input (shown only if item is included and not already-done) */}
                  {s?.include && !isDone && (
                    <div className="pl-7 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-14 shrink-0">Amount:</span>
                      <div className="relative max-w-[160px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          className="pl-7 h-8 text-sm"
                          value={s.amount_override}
                          onChange={(e) => setState(item.id, { amount_override: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      {s.amount_override !== item.amount && (
                        <span className="text-xs text-muted-foreground">
                          (template: {fmt(item.amount)})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Row 3: Updated-since-generated warning + force_update option */}
                  {isUpdatedWarning && (
                    <div className="pl-7 rounded-md bg-orange-50 border border-orange-200 p-2 space-y-1.5">
                      <p className="text-xs text-orange-700 font-medium">
                        ⚠️ Template was updated after this month's transaction was created
                        {item.generated_amount !== null && ` (created with ${fmt(item.generated_amount)})`}.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={s?.force_update ?? false}
                          onCheckedChange={(v) => setState(item.id, { force_update: !!v, include: true })}
                        />
                        <span className="text-xs text-orange-700">
                          Update existing transaction to new amount ({fmt(s?.amount_override ?? item.amount)})
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Row 4: Already generated info row */}
                  {item.status === "generated" && (
                    <div className="pl-7 text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Generated {fmt(item.generated_amount ?? item.amount)} this month
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
