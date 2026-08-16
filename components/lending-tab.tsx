"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { EmptyState } from "@/components/ui/states"
import { toast } from "@/hooks/use-toast"
import TransactionForm from "@/components/transaction-form"

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

interface Summary {
  totalOwedToMe: number
  totalIOwe: number
  totalInterestEarned: number
  totalInterestPaid: number
  outstandingLendingCount: number
  outstandingBorrowingCount: number
  overdueCount: number
}

/**
 * "How much does Friend owe me, total?" — one person can have several
 * separate loans (a direct loan, plus one receivable per Bill Split they
 * were part of). This is the net balance across ALL of them, so you don't
 * have to manually add up cards to answer that question.
 */
interface PersonBalance {
  personName: string
  owedToMe: number
  iOwe: number
  netPosition: number
  loanCount: number
  hasOverdue: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtINR  = (n: number) => "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN")
const fmtDate = (s?: string) => { if (!s) return "—"; try { return format(parseISO(s), "dd MMM yyyy") } catch { return s } }

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

const DIRECTION_CFG: Record<Direction, { color: string; bg: string; label: string; verb: string }> = {
  lent:     { color: "#0369a1", bg: "#eff6ff", label: "Owed to you", verb: "Lent to" },
  borrowed: { color: "#b45309", bg: "#fffbeb", label: "You owe", verb: "Borrowed from" },
}

// ─── Add Loan dialog ──────────────────────────────────────────────────────────

type FormState = {
  personName: string; direction: Direction; principalAmount: string
  loanDate: string; dueDate: string; notes: string
}

const BLANK_FORM: FormState = {
  personName: "", direction: "lent", principalAmount: "",
  loanDate: new Date().toISOString().slice(0, 10), dueDate: "", notes: "",
}

function AddLoanDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({ ...BLANK_FORM })
  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }))

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
        setForm({ ...BLANK_FORM })
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Loan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>Record a Borrowing / Lending</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Direction */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Direction *</Label>
            <Select value={form.direction} onValueChange={v => set("direction", v as Direction)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lent">I gave money (Lending)</SelectItem>
                <SelectItem value="borrowed">I received money (Borrowing)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Person name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Person's Name *</Label>
            <Input placeholder="e.g. Ravi" value={form.personName} onChange={e => set("personName", e.target.value)} />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Amount (₹) *</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input className="pl-9" placeholder="5,000" inputMode="numeric"
                value={form.principalAmount} onChange={e => set("principalAmount", e.target.value)} />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date *</Label>
              <Input type="date" value={form.loanDate} onChange={e => set("loanDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Due Date (optional)</Label>
              <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes (optional)</Label>
            <Textarea rows={2} placeholder="e.g. for medical emergency" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>

        <div className="px-5 py-4 border-t shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setForm({ ...BLANK_FORM }); setOpen(false) }}>Cancel</Button>
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
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState("")

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setAmount(String(loan.outstandingAmount))
      setInterestAmount("")
      setRepaymentDate(new Date().toISOString().slice(0, 10))
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
    repaymentDate

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
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
          Record Repayment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>
            {loan.direction === "lent" ? `${loan.personName} is repaying you` : `Repay ${loan.personName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Outstanding: <span className="font-semibold tnum">{fmtINR(loan.outstandingAmount)}</span>
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Principal Amount (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input className="pl-9" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            {principalNum > loan.outstandingAmount && (
              <p className="text-[11px] text-destructive-text">Cannot exceed outstanding balance</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Interest / Extra Amount (₹, optional)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input className="pl-9" inputMode="numeric" placeholder="0" value={interestAmount} onChange={e => setInterestAmount(e.target.value)} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {loan.direction === "lent"
                ? "Anything above the principal — recorded as Income, not part of the loan balance."
                : "Anything above the principal — recorded as an Expense, not part of the loan balance."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date *</Label>
            <Input type="date" value={repaymentDate} onChange={e => setRepaymentDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="px-5 py-4 border-t shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!isValid || saving} onClick={handleSubmit}>
            {saving ? "Saving…" : "Record Repayment"}
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
        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>Edit Loan</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Person's Name</Label>
            <Input value={personName} onChange={e => setPersonName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Principal and amounts can't be edited directly — record a repayment instead.
          </p>
        </div>

        <div className="px-5 py-4 border-t shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!personName.trim() || saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Loan confirmation dialog ─────────────────────────────────────────

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
        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive-text hover:bg-muted transition-colors" title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="animate-in fade-in zoom-in-95 duration-200">
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

// ─── Loan card ────────────────────────────────────────────────────────────────

function LoanCard({ loan, onSaved }: { loan: Loan; onSaved: () => void }) {
  const cfg = DIRECTION_CFG[loan.direction]
  const pctPaid = loan.principalAmount > 0
    ? ((loan.principalAmount - loan.outstandingAmount) / loan.principalAmount) * 100
    : 0
  const settled = loan.status === "settled"

  return (
    <Card className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${settled ? "opacity-60" : ""}`}>
      <div className="h-1 w-full" style={{ backgroundColor: loan.isOverdue ? "#dc2626" : cfg.color }} />
      <CardContent className="p-5 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
              <span style={{ color: cfg.color }}>
                {loan.direction === "lent" ? <HandCoins className="h-5 w-5" /> : <HandHeart className="h-5 w-5" />}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{loan.personName}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <Badge className="text-[10px] px-1.5 py-0 font-medium border-0" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </Badge>
                {loan.isOverdue && (
                  <Badge className="text-[10px] px-1.5 py-0 gap-0.5 border-0 bg-destructive-subtle text-destructive-subtle-foreground">
                    <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                  </Badge>
                )}
                {settled && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Settled</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <EditLoanDialog loan={loan} onSaved={onSaved} />
            <DeleteLoanDialog loan={loan} onSaved={onSaved} />
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Principal</p>
            <p className="text-sm font-bold tnum mt-0.5">{fmtINR(loan.principalAmount)}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Outstanding</p>
            <p className="text-sm font-bold tnum mt-0.5">{fmtINR(loan.outstandingAmount)}</p>
          </div>
          {loan.totalInterest > 0 && (
            <div className="rounded-xl bg-muted/40 px-3 py-2 col-span-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {loan.direction === "lent" ? "Interest Earned" : "Interest Paid"}
              </p>
              <p className={`text-sm font-bold tnum mt-0.5 ${loan.direction === "lent" ? "text-success-text" : "text-warning-text"}`}>
                {fmtINR(loan.totalInterest)}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!settled && (
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pctPaid, 100)}%`, backgroundColor: cfg.color }} />
            </div>
            <p className="text-[11px] text-muted-foreground">{pctPaid.toFixed(0)}% repaid{loan.repaymentCount > 0 ? ` · ${loan.repaymentCount} repayment${loan.repaymentCount > 1 ? "s" : ""}` : ""}</p>
          </div>
        )}

        {/* Dates + notes */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Date</p>
            <p className="text-sm font-bold mt-0.5">{fmtDate(loan.loanDate)}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Due Date</p>
            <p className={`text-sm font-bold mt-0.5 ${loan.isOverdue ? "text-destructive-text" : ""}`}>{fmtDate(loan.dueDate)}</p>
          </div>
          {loan.notes && (
            <div className="rounded-xl bg-muted/40 px-3 py-2 col-span-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Notes</p>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{loan.notes}</p>
            </div>
          )}
        </div>

        {!settled && (
          <div className="flex justify-end">
            <RepaymentDialog loan={loan} onSaved={onSaved} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function LendingTab() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [personBalances, setPersonBalances] = useState<PersonBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | Direction>("all")
  const [personFilter, setPersonFilter] = useState<string | null>(null)
  const [txnFormOpen, setTxnFormOpen] = useState(false)

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

  const togglePersonFilter = (name: string) =>
    setPersonFilter((prev) => (prev === name ? null : name))

  const visible = loans
    .filter(l => filter === "all" || l.direction === filter)
    .filter(l => !personFilter || l.personName.trim().toLowerCase() === personFilter.trim().toLowerCase())
  const active = visible.filter(l => l.status !== "settled")
  const settled = visible.filter(l => l.status === "settled")

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Borrowings &amp; Lending</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Money you've given to or received from people — tracked separately from income/expense
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTxnFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add transaction
          </Button>
          <AddLoanDialog onSaved={refresh} />
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Owed to You",
            value: fmtINR(summary?.totalOwedToMe || 0),
            sub: `${summary?.outstandingLendingCount || 0} active`,
            cls: "text-info-text",
          },
          {
            label: "You Owe",
            value: fmtINR(summary?.totalIOwe || 0),
            sub: `${summary?.outstandingBorrowingCount || 0} active`,
            cls: "text-warning-text",
          },
          {
            label: "Net Position",
            value: fmtINR((summary?.totalOwedToMe || 0) - (summary?.totalIOwe || 0)),
            sub: (summary?.totalOwedToMe || 0) - (summary?.totalIOwe || 0) >= 0 ? "Net receivable" : "Net payable",
            cls: (summary?.totalOwedToMe || 0) - (summary?.totalIOwe || 0) >= 0 ? "text-success-text" : "text-destructive-text",
          },
          {
            label: "Overdue",
            value: String(summary?.overdueCount || 0),
            sub: "Past due date",
            cls: (summary?.overdueCount || 0) > 0 ? "text-destructive-text" : "",
          },
        ].map(t => (
          <div key={t.label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.label}</p>
            <p className={`text-xl font-bold tnum mt-2 ${t.cls}`}>{t.value}</p>
            <p className="text-xs text-muted-foreground mt-1 tnum">{t.sub}</p>
          </div>
        ))}
      </div>

      {/* Interest tiles — only shown once there's something to show */}
      {((summary?.totalInterestEarned || 0) > 0 || (summary?.totalInterestPaid || 0) > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Interest Earned</p>
            <p className="text-xl font-bold tnum mt-2 text-success-text">{fmtINR(summary?.totalInterestEarned || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Extra received on money you lent — counted as Income</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Interest Paid</p>
            <p className="text-xl font-bold tnum mt-2 text-warning-text">{fmtINR(summary?.totalInterestPaid || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Extra you paid on money you borrowed — counted as Expense</p>
          </div>
        </div>
      )}

      {/* By Person — answers "how much does Friend owe me, total?" without
          having to manually add up separate cards (a direct loan plus one
          receivable per Bill Split they were part of all count together). */}
      {personBalances.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">By Person</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {personBalances.map((p) => {
              const isSelected = personFilter?.trim().toLowerCase() === p.personName.trim().toLowerCase()
              const positive = p.netPosition >= 0
              return (
                <button
                  key={p.personName}
                  onClick={() => togglePersonFilter(p.personName)}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{p.personName}</span>
                    {p.hasOverdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive-text shrink-0" />}
                  </div>
                  <p className={`text-lg font-bold tnum mt-1 ${positive ? "text-success-text" : "text-destructive-text"}`}>
                    {positive ? "+" : "−"}{fmtINR(Math.abs(p.netPosition))}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {positive ? "owes you" : "you owe"} · {p.loanCount} loan{p.loanCount !== 1 ? "s" : ""}
                  </p>
                </button>
              )
            })}
          </div>
          {personFilter && (
            <button
              onClick={() => setPersonFilter(null)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear person filter ({personFilter})
            </button>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(["all", "lent", "borrowed"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-input hover:bg-muted"
            }`}
          >
            {f === "all" ? "All" : f === "lent" ? "Lent" : "Borrowed"}
          </button>
        ))}
      </div>

      {/* Cards */}
      {!loading && active.length === 0 && settled.length === 0 ? (
        <EmptyState
          className="rounded-2xl border border-dashed"
          icon={HandCoins}
          title="No loans yet"
          description="Record money you've lent to or borrowed from friends/family to track who owes whom."
          action={<AddLoanDialog onSaved={refresh} />}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map(l => <LoanCard key={l.id} loan={l} onSaved={refresh} />)}
          </div>
          {settled.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Settled</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settled.map(l => <LoanCard key={l.id} loan={l} onSaved={refresh} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Explainer note */}
      <div className="flex items-start gap-3 rounded-xl border border-info/25 bg-info-subtle p-3.5 text-sm">
        <Info className="h-4 w-4 text-info-subtle-foreground shrink-0 mt-0.5" />
        <p className="text-info-subtle-foreground">
          Lending/borrowing the principal is <strong>not income or expense</strong> — it's just cash moving between
          you and another person, with the same amount expected back. Any interest or extra you receive/pay on top of
          the principal is different, though — that's a real gain or cost, so it's recorded as Income or Expense and
          does show up in those totals.
        </p>
      </div>

      {/* TransactionForm does its own create API call — this just closes the
          dialog and refreshes loans/summary in case the new transaction is
          a repayment or interest entry that affects them. */}
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
