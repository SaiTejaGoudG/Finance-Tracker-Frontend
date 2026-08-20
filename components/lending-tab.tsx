"use client"

/**
 * Borrowings & Lending — people-first.
 *
 * The unit people actually think in is a PERSON, not a loan ("what's the
 * deal with Ravi?"), and one person can easily hold several separate
 * balances: a direct loan plus one receivable per bill split they were in.
 * So the master list is people with their net balance, and clicking through
 * opens everything about that person — each loan, and a merged repayment
 * timeline across all of them.
 *
 * That timeline is the thing the old card-grid had no room for: repayments
 * were counted ("3 repayments") but never listed, and the note captured on
 * each one was written to the DB and then never shown anywhere.
 *
 * Master→detail mirrors the Credit Cards page. Colors are semantic tokens
 * (they invert in dark mode) rather than the hardcoded hex this screen used
 * to carry.
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, HandCoins, HandHeart, IndianRupee, AlertTriangle, Pencil, Trash2, Info, Loader2,
  ChevronRight, ArrowLeft,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { EmptyState, SkeletonRows } from "@/components/ui/states"
import { toast } from "@/hooks/use-toast"
import TransactionForm from "@/components/transaction-form"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Direction = "lent" | "borrowed"
type LoanStatus = "outstanding" | "partially_settled" | "settled"

interface Loan {
  id: string
  personName: string
  direction: Direction
  principalAmount: number
  outstandingAmount: number
  loanDate: string
  dueDate?: string
  notes?: string
  status: LoanStatus
  isOverdue: boolean
  repaymentCount: number
  totalInterest: number
}

interface Repayment {
  id: number
  loanId: string
  direction: Direction
  amount: number
  interestAmount: number
  date: string
  notes?: string
}

interface Summary {
  totalOwedToMe: number
  totalIOwe: number
  totalInterestEarned: number
  totalInterestPaid: number
  outstandingLendingCount: number
  outstandingBorrowingCount: number
  overdueCount: number
}

interface PersonBalance {
  personName: string
  owedToMe: number
  iOwe: number
  netPosition: number
  loanCount: number
  hasOverdue: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (n: number) => "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN")
const fmtDate = (s?: string) => {
  if (!s) return "—"
  try { return format(parseISO(s), "dd MMM yyyy") } catch { return s }
}

/**
 * Today in the user's own timezone. `new Date().toISOString()` is UTC, so
 * in IST it returns yesterday's date until 05:30 — which silently
 * backdated every default date on this screen for anyone using it early in
 * the morning.
 */
function todayLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function transformApiLoan(raw: any): Loan {
  return {
    id: String(raw.id),
    personName: raw.person_name,
    direction: raw.direction as Direction,
    principalAmount: parseFloat(raw.principal_amount),
    outstandingAmount: parseFloat(raw.outstanding_amount),
    loanDate: raw.loan_date,
    dueDate: raw.due_date || undefined,
    notes: raw.notes || undefined,
    status: raw.status as LoanStatus,
    isOverdue: Boolean(raw.is_overdue),
    repaymentCount: raw.repaymentCount || 0,
    totalInterest: parseFloat(raw.totalInterest) || 0,
  }
}

const DIRECTION_CFG: Record<Direction, {
  label: string; verb: string; badge: string; icon: string; bar: string; amount: string
}> = {
  lent: {
    label: "Owed to you",
    verb: "Lent to",
    badge: "bg-info-subtle text-info-subtle-foreground",
    icon: "bg-info-subtle text-info-text",
    bar: "bg-info",
    amount: "text-success-text",
  },
  borrowed: {
    label: "You owe",
    verb: "Borrowed from",
    badge: "bg-warning-subtle text-warning-subtle-foreground",
    icon: "bg-warning-subtle text-warning-text",
    bar: "bg-warning",
    amount: "text-destructive-text",
  },
}

// ─── Add Loan dialog ──────────────────────────────────────────────────────────

type FormState = {
  personName: string; direction: Direction; principalAmount: string
  loanDate: string; dueDate: string; notes: string
}

/**
 * A function, not a module-level const — a const is evaluated once at
 * import, so a tab left open overnight would keep offering yesterday's date
 * as the default.
 */
const blankForm = (): FormState => ({
  personName: "", direction: "lent", principalAmount: "",
  loanDate: todayLocal(), dueDate: "", notes: "",
})

function AddLoanDialog({ onSaved, presetPerson }: { onSaved: () => void; presetPerson?: string }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(blankForm)
  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleOpenChange = (v: boolean) => {
    if (v) setForm({ ...blankForm(), personName: presetPerson || "" })
    setOpen(v)
  }

  const isValid = form.personName.trim() && Number(form.principalAmount) > 0 && form.loanDate

  const handleAdd = async () => {
    setSaving(true)
    try {
      const res = await apiClient(apiUrl("/personal-loans/store"), {
        method: "POST",
        body: JSON.stringify({
          person_name: form.personName.trim(),
          direction: form.direction,
          principal_amount: Number(form.principalAmount),
          loan_date: form.loanDate,
          due_date: form.dueDate || null,
          notes: form.notes || null,
          create_transaction: true,
        }),
      })
      if (res.ok) {
        setOpen(false)
        onSaved()
        toast({ title: "Saved", description: "Loan recorded successfully" })
      } else {
        const json = await res.json().catch(() => ({}))
        toast({ title: "Error", description: json?.message || "Failed to save loan", variant: "destructive" })
      }
    } catch (e) {
      console.error("Failed to save loan", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" /> Add loan
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[520px]">
        <DialogHeader className="shrink-0 border-b px-5 pb-3 pt-5">
          <DialogTitle>Record a borrowing / lending</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Direction *</Label>
            <Select value={form.direction} onValueChange={v => set("direction", v as Direction)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lent">I gave money (Lending)</SelectItem>
                <SelectItem value="borrowed">I received money (Borrowing)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Person's name *</Label>
            <Input placeholder="e.g. Ravi" value={form.personName} onChange={e => set("personName", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Amount (₹) *</Label>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="5,000" inputMode="numeric"
                value={form.principalAmount} onChange={e => set("principalAmount", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date *</Label>
              <Input type="date" value={form.loanDate} onChange={e => set("loanDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Due date (optional)</Label>
              <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notes (optional)</Label>
            <Textarea rows={2} placeholder="e.g. for medical emergency" value={form.notes} onChange={e => set("notes", e.target.value)} />
            <p className="text-[11px] text-muted-foreground">
              Used as the ledger description too, so this is what you'll search for later.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!isValid || saving} onClick={handleAdd}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Record Repayment dialog ──────────────────────────────────────────────────

function RepaymentDialog({ loan, onSaved }: { loan: Loan; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [amount, setAmount] = useState(String(loan.outstandingAmount))
  const [interestAmount, setInterestAmount] = useState("")
  const [notes, setNotes] = useState("")
  // Seeded once, deliberately NOT reset when the dialog reopens. The old
  // handleOpenChange re-stamped this with today on every open, so picking a
  // date, closing the dialog and reopening it silently threw the pick away
  // and filed the repayment under today instead.
  const [repaymentDate, setRepaymentDate] = useState(todayLocal)

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setAmount(String(loan.outstandingAmount))
      setInterestAmount("")
      setNotes("")
    }
    setOpen(v)
  }

  const principalNum = Number(amount) || 0
  const interestNum = Number(interestAmount) || 0
  const isValid =
    principalNum >= 0 && interestNum >= 0 &&
    (principalNum > 0 || interestNum > 0) &&
    principalNum <= loan.outstandingAmount &&
    Boolean(repaymentDate)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const res = await apiClient(apiUrl(`/personal-loans/${loan.id}/repayment`), {
        method: "POST",
        body: JSON.stringify({
          amount: principalNum,
          interest_amount: interestNum,
          repayment_date: repaymentDate,
          notes: notes || null,
          create_transaction: true,
        }),
      })
      if (res.ok) {
        setOpen(false)
        onSaved()
        toast({ title: "Recorded", description: "Repayment recorded successfully" })
      } else {
        const json = await res.json().catch(() => ({}))
        toast({ title: "Error", description: json?.message || "Failed to record repayment", variant: "destructive" })
      }
    } catch (e) {
      console.error("Failed to record repayment", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
          Record repayment
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[420px]">
        <DialogHeader className="shrink-0 border-b px-5 pb-3 pt-5">
          <DialogTitle>
            {loan.direction === "lent" ? `${loan.personName} is repaying you` : `Repay ${loan.personName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-xs text-muted-foreground">
            Outstanding: <span className="tnum font-semibold">{fmtINR(loan.outstandingAmount)}</span>
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Principal amount (₹)</Label>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            {principalNum > loan.outstandingAmount && (
              <p className="text-[11px] text-destructive-text">Cannot exceed outstanding balance</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Interest / extra amount (₹, optional)</Label>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" inputMode="numeric" placeholder="0" value={interestAmount} onChange={e => setInterestAmount(e.target.value)} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {loan.direction === "lent"
                ? "Anything above the principal — recorded as Income, not part of the loan balance."
                : "Anything above the principal — recorded as an Expense, not part of the loan balance."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date paid *</Label>
            <Input type="date" value={repaymentDate} onChange={e => setRepaymentDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notes (optional)</Label>
            <Textarea rows={2} placeholder="e.g. paid via UPI" value={notes} onChange={e => setNotes(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">
              Used as the ledger description too, same as when adding a loan.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!isValid || saving} onClick={handleSubmit}>
            {saving ? "Saving…" : "Record repayment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Loan dialog ─────────────────────────────────────────────────────────

function EditLoanDialog({ loan, onSaved }: { loan: Loan; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [personName, setPersonName] = useState(loan.personName)
  const [dueDate, setDueDate] = useState(loan.dueDate || "")
  const [notes, setNotes] = useState(loan.notes || "")

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setPersonName(loan.personName)
      setDueDate(loan.dueDate || "")
      setNotes(loan.notes || "")
    }
    setOpen(v)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await apiClient(apiUrl(`/personal-loans/${loan.id}`), {
        method: "PUT",
        body: JSON.stringify({
          person_name: personName.trim(),
          due_date: dueDate || null,
          notes: notes || null,
        }),
      })
      if (res.ok) {
        setOpen(false)
        onSaved()
        toast({ title: "Saved", description: "Loan updated" })
      } else {
        const json = await res.json().catch(() => ({}))
        toast({ title: "Error", description: json?.message || "Failed to update loan", variant: "destructive" })
      }
    } catch (e) {
      console.error("Failed to update loan", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[420px]">
        <DialogHeader className="shrink-0 border-b px-5 pb-3 pt-5">
          <DialogTitle>Edit loan</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Person's name</Label>
            <Input value={personName} onChange={e => setPersonName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Due date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Editing the note also updates the linked ledger entry's description. Principal and
            amounts can't be edited directly — record a repayment instead.
          </p>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!personName.trim() || saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Loan confirmation ────────────────────────────────────────────────

function DeleteLoanDialog({ loan, onSaved }: { loan: Loan; onSaved: () => void }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await apiClient(apiUrl(`/personal-loans/${loan.id}`), { method: "DELETE" })
      if (res.ok) {
        onSaved()
        toast({ title: "Deleted", description: "Loan record removed" })
      } else {
        const json = await res.json().catch(() => ({}))
        toast({ title: "Error", description: json?.message || "Failed to delete loan", variant: "destructive" })
      }
    } catch (e) {
      console.error("Failed to delete loan", e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive-text"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="duration-200 animate-in fade-in zoom-in-95">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this loan record?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the loan with{" "}
            <span className="font-semibold text-foreground">{loan.personName}</span>, along with the original
            transaction and every repayment (including any interest earned/paid) linked to it. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-between gap-3 pt-6">
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────

function Kpi({
  label, value, sub, tone, emphasis,
}: {
  label: string
  value: string
  sub?: string
  tone?: "success" | "destructive" | "info" | "warning"
  emphasis?: boolean
}) {
  const toneClass =
    tone === "success" ? "text-success-text"
      : tone === "destructive" ? "text-destructive-text"
        : tone === "info" ? "text-info-text"
          : tone === "warning" ? "text-warning-text"
            : "text-foreground"
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-sm", emphasis && "ring-1 ring-primary/20")}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("tnum mt-1 font-bold", emphasis ? "text-2xl" : "text-xl", toneClass)}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ─── One loan, inside the person detail ──────────────────────────────────────

function LoanBlock({ loan, onSaved }: { loan: Loan; onSaved: () => void }) {
  const cfg = DIRECTION_CFG[loan.direction]
  const settled = loan.status === "settled"
  const pctPaid = loan.principalAmount > 0
    ? ((loan.principalAmount - loan.outstandingAmount) / loan.principalAmount) * 100
    : 0

  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-sm", settled && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", cfg.icon)}>
            {loan.direction === "lent" ? <HandCoins className="h-4 w-4" /> : <HandHeart className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="tnum text-sm font-semibold">
              {fmtINR(loan.principalAmount)}{" "}
              <span className="font-normal text-muted-foreground">
                {loan.direction === "lent" ? "lent" : "borrowed"} · {fmtDate(loan.loanDate)}
              </span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge className={cn("border-0 px-1.5 py-0 text-[10px] font-medium", cfg.badge)}>{cfg.label}</Badge>
              {loan.isOverdue && (
                <Badge className="gap-0.5 border-0 bg-destructive-subtle px-1.5 py-0 text-[10px] text-destructive-subtle-foreground">
                  <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                </Badge>
              )}
              {settled && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">Settled</Badge>}
              {loan.dueDate && !settled && (
                <span className={cn("text-[11px]", loan.isOverdue ? "text-destructive-text" : "text-muted-foreground")}>
                  due {fmtDate(loan.dueDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <EditLoanDialog loan={loan} onSaved={onSaved} />
          <DeleteLoanDialog loan={loan} onSaved={onSaved} />
        </div>
      </div>

      {!settled && (
        <div className="mt-3 space-y-1">
          <div className="flex items-baseline justify-between text-[11px]">
            <span className="text-muted-foreground">
              {pctPaid.toFixed(0)}% repaid
              {loan.repaymentCount > 0 && ` · ${loan.repaymentCount} payment${loan.repaymentCount > 1 ? "s" : ""}`}
            </span>
            <span className="tnum font-semibold">{fmtINR(loan.outstandingAmount)} left</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", cfg.bar)} style={{ width: `${Math.min(pctPaid, 100)}%` }} />
          </div>
        </div>
      )}

      {loan.totalInterest > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {loan.direction === "lent" ? "Interest earned" : "Interest paid"}:{" "}
          <span className={cn("tnum font-semibold", loan.direction === "lent" ? "text-success-text" : "text-warning-text")}>
            {fmtINR(loan.totalInterest)}
          </span>
        </p>
      )}

      {loan.notes && <p className="mt-2 text-xs text-muted-foreground">{loan.notes}</p>}

      {!settled && (
        <div className="mt-3 flex justify-end">
          <RepaymentDialog loan={loan} onSaved={onSaved} />
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

type DirFilter = "all" | Direction | "overdue"

export default function LendingTab() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [personBalances, setPersonBalances] = useState<PersonBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<DirFilter>("all")
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [txnFormOpen, setTxnFormOpen] = useState(false)

  const [repayments, setRepayments] = useState<Repayment[]>([])
  const [repaymentsLoading, setRepaymentsLoading] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [loansRes, summaryRes, byPersonRes] = await Promise.all([
        apiClient(apiUrl("/personal-loans/listing")),
        apiClient(apiUrl("/personal-loans/summary")),
        apiClient(apiUrl("/personal-loans/by-person")),
      ])
      if (loansRes.ok) {
        const json = await loansRes.json()
        setLoans((json.data || []).map(transformApiLoan))
      }
      if (summaryRes.ok) {
        const json = await summaryRes.json()
        setSummary(json.data)
      }
      if (byPersonRes.ok) {
        const json = await byPersonRes.json()
        setPersonBalances(json.data || [])
      }
    } catch (e) {
      console.error("Failed to fetch loans", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const personLoans = useMemo(
    () => selectedPerson
      ? loans.filter(l => l.personName.trim().toLowerCase() === selectedPerson.trim().toLowerCase())
      : [],
    [loans, selectedPerson],
  )

  /**
   * Repayment history comes from GET /personal-loans/:id, which already
   * returns a loan's repayments — one call per loan the person holds (a
   * small number in practice), merged into a single timeline. Only fetched
   * when a person is actually opened, so the master list stays one request.
   */
  useEffect(() => {
    if (!selectedPerson || personLoans.length === 0) {
      setRepayments([])
      return
    }
    let cancelled = false
    setRepaymentsLoading(true)
    ;(async () => {
      try {
        const results = await Promise.all(
          personLoans.map(async (l) => {
            const res = await apiClient(apiUrl(`/personal-loans/${l.id}`))
            if (!res.ok) return [] as Repayment[]
            const json = await res.json().catch(() => ({}))
            const rows: any[] = json?.data?.repayments || []
            return rows.map((r) => ({
              id: r.id,
              loanId: l.id,
              direction: l.direction,
              amount: parseFloat(r.amount) || 0,
              interestAmount: parseFloat(r.interest_amount) || 0,
              date: r.repayment_date,
              notes: r.notes || undefined,
            })) as Repayment[]
          }),
        )
        if (cancelled) return
        const merged = results.flat().sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id)
        setRepayments(merged)
      } catch {
        if (!cancelled) setRepayments([])
      } finally {
        if (!cancelled) setRepaymentsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedPerson, personLoans])

  // Overdue is a per-loan flag, so roll it up to the person for filtering.
  const overdueByPerson = useMemo(() => {
    const s = new Set<string>()
    for (const l of loans) if (l.isOverdue) s.add(l.personName.trim().toLowerCase())
    return s
  }, [loans])

  const directionsByPerson = useMemo(() => {
    const m = new Map<string, Set<Direction>>()
    for (const l of loans) {
      const k = l.personName.trim().toLowerCase()
      if (!m.has(k)) m.set(k, new Set())
      m.get(k)!.add(l.direction)
    }
    return m
  }, [loans])

  const visiblePeople = useMemo(() => {
    return personBalances.filter((p) => {
      const k = p.personName.trim().toLowerCase()
      if (filter === "overdue") return overdueByPerson.has(k)
      if (filter === "lent") return directionsByPerson.get(k)?.has("lent")
      if (filter === "borrowed") return directionsByPerson.get(k)?.has("borrowed")
      return true
    })
  }, [personBalances, filter, overdueByPerson, directionsByPerson])

  const netPosition = (summary?.totalOwedToMe ?? 0) - (summary?.totalIOwe ?? 0)
  const selectedBalance = personBalances.find(
    p => p.personName.trim().toLowerCase() === selectedPerson?.trim().toLowerCase(),
  )
  const personInterest = personLoans.reduce((s, l) => s + l.totalInterest, 0)

  const FILTERS: Array<{ key: DirFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "lent", label: "They owe you" },
    { key: "borrowed", label: "You owe" },
    { key: "overdue", label: "Overdue" },
  ]

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selectedPerson) {
    const activeLoans = personLoans.filter(l => l.status !== "settled")
    const settledLoans = personLoans.filter(l => l.status === "settled")

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSelectedPerson(null)}>
            <ArrowLeft className="h-4 w-4" /> All people
          </Button>
          <AddLoanDialog onSaved={refresh} presetPerson={selectedPerson} />
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight">{selectedPerson}</h2>
          <p className="text-xs text-muted-foreground">
            {personLoans.length} {personLoans.length === 1 ? "loan" : "loans"} on record
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="Net"
            value={`${(selectedBalance?.netPosition ?? 0) >= 0 ? "+" : "−"}${fmtINR(selectedBalance?.netPosition ?? 0)}`}
            sub={(selectedBalance?.netPosition ?? 0) >= 0 ? "In your favour" : "You're behind"}
            tone={(selectedBalance?.netPosition ?? 0) >= 0 ? "success" : "destructive"}
            emphasis
          />
          <Kpi label="Owes you" value={fmtINR(selectedBalance?.owedToMe ?? 0)} tone="info" />
          <Kpi label="You owe" value={fmtINR(selectedBalance?.iOwe ?? 0)} tone="warning" />
          <Kpi label="Interest" value={fmtINR(personInterest)} sub="Across all their loans" />
        </div>

        {activeLoans.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</h3>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {activeLoans.map(l => <LoanBlock key={l.id} loan={l} onSaved={refresh} />)}
            </div>
          </div>
        )}

        {settledLoans.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Settled</h3>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {settledLoans.map(l => <LoanBlock key={l.id} loan={l} onSaved={refresh} />)}
            </div>
          </div>
        )}

        {/* Repayment timeline — the thing the old design counted but never showed. */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Repayment history</h3>
            <p className="text-xs text-muted-foreground">Every payment across all of this person's loans.</p>
          </div>
          {repaymentsLoading ? (
            <div className="p-4"><SkeletonRows rows={3} columns={3} /></div>
          ) : repayments.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No repayments recorded yet.
            </p>
          ) : (
            <ul className="divide-y">
              {repayments.map((r) => {
                const incoming = r.direction === "lent"
                return (
                  <li key={`${r.loanId}-${r.id}`} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {incoming ? `${selectedPerson} paid you` : `You paid ${selectedPerson}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{fmtDate(r.date)}</p>
                      {r.notes && <p className="mt-0.5 text-xs text-muted-foreground">{r.notes}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("tnum text-sm font-semibold", incoming ? "text-success-text" : "text-destructive-text")}>
                        {incoming ? "+" : "−"}{fmtINR(r.amount)}
                      </p>
                      {r.interestAmount > 0 && (
                        <p className={cn("tnum text-[11px]", incoming ? "text-success-text" : "text-warning-text")}>
                          {incoming ? "+" : "−"}{fmtINR(r.interestAmount)} interest
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    )
  }

  // ── Master view ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setTxnFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add transaction
        </Button>
        <AddLoanDialog onSaved={refresh} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Net position"
          value={`${netPosition >= 0 ? "+" : "−"}${fmtINR(netPosition)}`}
          sub={netPosition >= 0 ? "Net receivable" : "Net payable"}
          tone={netPosition >= 0 ? "success" : "destructive"}
          emphasis
        />
        <Kpi
          label="Owed to you"
          value={fmtINR(summary?.totalOwedToMe ?? 0)}
          sub={`${summary?.outstandingLendingCount ?? 0} active`}
          tone="info"
        />
        <Kpi
          label="You owe"
          value={fmtINR(summary?.totalIOwe ?? 0)}
          sub={`${summary?.outstandingBorrowingCount ?? 0} active`}
          tone="warning"
        />
        <Kpi
          label="Overdue"
          value={String(summary?.overdueCount ?? 0)}
          sub="Past due date"
          tone={(summary?.overdueCount ?? 0) > 0 ? "destructive" : undefined}
        />
      </div>

      {((summary?.totalInterestEarned ?? 0) > 0 || (summary?.totalInterestPaid ?? 0) > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Kpi
            label="Interest earned"
            value={fmtINR(summary?.totalInterestEarned ?? 0)}
            sub="Extra received on money you lent — counted as Income"
            tone="success"
          />
          <Kpi
            label="Interest paid"
            value={fmtINR(summary?.totalInterestPaid ?? 0)}
            sub="Extra you paid on money you borrowed — counted as Expense"
            tone="warning"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {label}
            {key === "overdue" && (summary?.overdueCount ?? 0) > 0 && ` (${summary?.overdueCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <SkeletonRows rows={4} columns={3} />
        </div>
      ) : personBalances.length === 0 ? (
        <EmptyState
          className="rounded-2xl border border-dashed"
          icon={HandCoins}
          title="No loans yet"
          description="Record money you've lent to or borrowed from someone and it'll show up here."
          action={<AddLoanDialog onSaved={refresh} />}
        />
      ) : visiblePeople.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Nobody matches this filter.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <ul className="divide-y">
            {visiblePeople.map((p) => {
              const k = p.personName.trim().toLowerCase()
              const isOverdue = overdueByPerson.has(k)
              const positive = p.netPosition >= 0
              return (
                <li key={p.personName}>
                  <button
                    onClick={() => setSelectedPerson(p.personName)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                        positive ? DIRECTION_CFG.lent.icon : DIRECTION_CFG.borrowed.icon,
                      )}>
                        {positive ? <HandCoins className="h-4 w-4" /> : <HandHeart className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {p.personName}
                          {isOverdue && (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive-text" aria-label="Has an overdue loan" />
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {positive ? "owes you" : "you owe"} · {p.loanCount}{" "}
                          {p.loanCount === 1 ? "loan" : "loans"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={cn("tnum text-sm font-semibold", positive ? "text-success-text" : "text-destructive-text")}>
                        {positive ? "+" : "−"}{fmtINR(p.netPosition)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl border bg-info-subtle/40 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info-text" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">
          Lending or borrowing the principal isn't income or expense — it's money changing hands, so
          it stays out of your P&amp;L. Interest on top of it <em>is</em> counted: earned interest as
          Income, paid interest as an Expense.
        </p>
      </div>

      <Dialog open={txnFormOpen} onOpenChange={setTxnFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm
            onSubmit={async () => {
              setTxnFormOpen(false)
              toast({ title: "Transaction added" })
              refresh()
            }}
            onCancel={() => setTxnFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
