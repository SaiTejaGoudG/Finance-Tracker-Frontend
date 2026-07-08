"use client"

import { useState, useEffect } from "react"
import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Pencil, Trash2, Repeat, ChevronDown, ChevronUp } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecurringTemplate = {
  id: number
  description: string
  amount: number
  category: string | null
  transaction_type: string
  card_id: number | null
  card_name: string | null
  owner_type: string | null
  expense_type: string | null
  day_of_month: number
  active: boolean
  notes: string | null
}

type CreditCard = { id: number; card_name: string }

type FormState = Omit<RecurringTemplate, "id" | "active"> & { id?: number }

const EMPTY_FORM: FormState = {
  description: "",
  amount: 0,
  category: "",
  transaction_type: "Expense",
  card_id: null,
  card_name: null,
  owner_type: "self",
  expense_type: "fixed",
  day_of_month: 1,
  notes: "",
}

const TX_TYPES = ["Income", "Expense", "Credit Card", "Petty Cash", "Investment"]
const OWNER_TYPES = ["self", "brother", "friend", "other"]
const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Utilities", "Entertainment", "Shopping", "Healthcare",
  "Education", "Housing", "Personal Care", "Travel", "Gifts", "Chitti",
  "Credit Card Payment", "Freelancing", "Debt", "EMI", "Other Expenses",
]
const INCOME_CATEGORIES = ["Salary", "Freelancing", "Dividends", "Rental Income", "Other Income"]
const INVESTMENT_CATEGORIES = ["Mutual Funds", "Stocks", "Gold", "Real Estate", "Fixed Deposit", "PPF", "NPS", "Other Investment"]

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  open: boolean
  onClose: () => void
}

export default function RecurringManageModal({ open, onClose }: Props) {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<RecurringTemplate[]>([])
  const [cards, setCards] = useState<CreditCard[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // ── Fetch templates + cards ──────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    fetchTemplates()
    fetchCards()
  }, [open])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await apiClient(apiUrl("recurring/listing"))
      const json = await res.json()
      setTemplates(json.data || [])
    } catch {
      toast({ title: "Error", description: "Failed to load recurring templates", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchCards = async () => {
    try {
      const res = await apiClient(apiUrl("configurations/listing"))
      const json = await res.json()
      setCards(json.data || [])
    } catch { /* non-fatal */ }
  }

  // ── Form helpers ─────────────────────────────────────────────────────────
  const openNewForm = () => {
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEditForm = (t: RecurringTemplate) => {
    setForm({
      id: t.id,
      description: t.description,
      amount: t.amount,
      category: t.category || "",
      transaction_type: t.transaction_type,
      card_id: t.card_id,
      card_name: t.card_name,
      owner_type: t.owner_type || "self",
      expense_type: t.expense_type || "fixed",
      day_of_month: t.day_of_month,
      notes: t.notes || "",
    })
    setShowForm(true)
  }

  const cancelForm = () => {
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  const setField = (key: keyof FormState, value: any) =>
    setForm((f) => ({ ...f, [key]: value }))

  const getCategoriesForType = () => {
    if (form.transaction_type === "Income") return INCOME_CATEGORIES
    if (form.transaction_type === "Investment") return INVESTMENT_CATEGORIES
    return EXPENSE_CATEGORIES
  }

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.description.trim()) return toast({ title: "Description required", variant: "destructive" })
    if (!form.amount || form.amount <= 0) return toast({ title: "Amount must be > 0", variant: "destructive" })
    if (!form.day_of_month || form.day_of_month < 1 || form.day_of_month > 31) {
      return toast({ title: "Day of month must be 1–31", variant: "destructive" })
    }

    setSaving(true)
    try {
      const payload: any = { ...form }
      if (form.transaction_type === "Credit Card" && form.card_id) {
        const card = cards.find((c) => c.id === Number(form.card_id))
        payload.card_name = card?.card_name || form.card_name
      } else {
        payload.card_id   = null
        payload.card_name = null
      }

      const isEdit = !!form.id
      const url  = isEdit ? apiUrl(`recurring/${form.id}`) : apiUrl("recurring/store")
      const method = isEdit ? "PUT" : "POST"

      const res = await apiClient(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Save failed")

      toast({ title: isEdit ? "Template updated" : "Template created" })
      cancelForm()
      fetchTemplates()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggle = async (t: RecurringTemplate) => {
    try {
      const res = await apiClient(apiUrl(`recurring/${t.id}/toggle`), { method: "PATCH" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, active: json.data.active } : x)))
    } catch (e: any) {
      toast({ title: "Toggle failed", description: e.message, variant: "destructive" })
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const res = await apiClient(apiUrl(`recurring/${id}`), { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast({ title: "Template deleted" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const typeColor: Record<string, string> = {
    Income: "text-green-600 bg-green-50",
    Expense: "text-red-600 bg-red-50",
    "Credit Card": "text-purple-600 bg-purple-50",
    "Petty Cash": "text-orange-600 bg-orange-50",
    Investment: "text-blue-600 bg-blue-50",
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Manage Recurring Transactions
          </DialogTitle>
        </DialogHeader>

        {/* ── Template List ──────────────────────────────────────────────── */}
        {!showForm && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Repeat className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No recurring templates yet.</p>
                <p className="text-xs mt-1">Create one to stop re-entering the same transactions.</p>
              </div>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between rounded-lg border p-3 gap-3 transition-opacity ${!t.active ? "opacity-50" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{t.description}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[t.transaction_type] || "bg-muted"}`}>
                        {t.transaction_type}
                      </span>
                      {!t.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Paused</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
                      <span>₹{t.amount.toLocaleString("en-IN")}</span>
                      {t.category && <span>· {t.category}</span>}
                      <span>· Day {t.day_of_month} of month</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={t.active}
                      onCheckedChange={() => handleToggle(t)}
                      title={t.active ? "Pause" : "Activate"}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditForm(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}

            <Button className="w-full" variant="outline" onClick={openNewForm}>
              <Plus className="h-4 w-4 mr-2" /> Add Recurring Template
            </Button>
          </div>
        )}

        {/* ── Create / Edit Form ─────────────────────────────────────────── */}
        {showForm && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">{form.id ? "Edit Template" : "New Recurring Template"}</h3>

            {/* Description */}
            <div className="space-y-1">
              <Label>Description *</Label>
              <Input
                placeholder="e.g. Salary, Rent, Netflix"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>

            {/* Amount + Day */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.amount || ""}
                  onChange={(e) => setField("amount", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label>Day of month *</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="1"
                  value={form.day_of_month || ""}
                  onChange={(e) => setField("day_of_month", parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">Transaction date each month (clamped to last day if month is shorter)</p>
              </div>
            </div>

            {/* Transaction Type */}
            <div className="space-y-1">
              <Label>Transaction Type *</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.transaction_type}
                onChange={(e) => setField("transaction_type", e.target.value)}
              >
                {TX_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Credit Card selector */}
            {form.transaction_type === "Credit Card" && (
              <div className="space-y-1">
                <Label>Credit Card</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.card_id || ""}
                  onChange={(e) => {
                    const id = parseInt(e.target.value)
                    const card = cards.find((c) => c.id === id)
                    setField("card_id", id || null)
                    setField("card_name", card?.card_name || null)
                  }}
                >
                  <option value="">Select card…</option>
                  {cards.map((c) => <option key={c.id} value={c.id}>{c.card_name}</option>)}
                </select>
              </div>
            )}

            {/* Category */}
            <div className="space-y-1">
              <Label>Category</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.category || ""}
                onChange={(e) => setField("category", e.target.value)}
              >
                <option value="">Select category…</option>
                {getCategoriesForType().map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Owner Type + Expense Type (only for Expense) */}
            {(form.transaction_type === "Expense" || form.transaction_type === "Petty Cash") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Owner</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.owner_type || "self"}
                    onChange={(e) => setField("owner_type", e.target.value)}
                  >
                    {OWNER_TYPES.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Expense Type</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.expense_type || "fixed"}
                    onChange={(e) => setField("expense_type", e.target.value)}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="variable">Variable</option>
                  </select>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Any notes…"
                value={form.notes || ""}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving…" : form.id ? "Update Template" : "Create Template"}
              </Button>
              <Button variant="outline" onClick={cancelForm} disabled={saving}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
