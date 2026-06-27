"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft, Landmark, CalendarClock, IndianRupee, Clock, TrendingDown,
  Calculator, Info, AlertTriangle, CheckCircle2, ChevronRight, Wallet, Plus,
} from "lucide-react"
import { format, addMonths, parseISO } from "date-fns"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

type LoanStatus = "Active" | "Closed" | "Foreclosed"
type EmiStatus  = "upcoming" | "paid" | "overdue"

interface Loan {
  id: string
  bankName: string
  loanType: string
  netDisbursedAmount: number
  processingFee: number
  apr: number           // e.g. 13.08
  tenureMonths: number
  standardEmi: number
  finalEmi: number
  emiDueDay: number     // 7 → 7th of every month
  emiStartDate: string  // "YYYY-MM-DD"
  disbursementDate: string
  status: LoanStatus
  accentColor: string   // hex for card accent
  paidEmis: number
  isPlaceholder?: boolean
}

interface EmiRow {
  emiNo: number
  dueDate: string
  emiAmount: number
  principal: number
  interest: number
  openingBalance: number
  closingBalance: number
  status: EmiStatus
}

// ─── Static Data (commented out — now fully dynamic from API) ─────────────────
//
// const LOANS: Loan[] = [
//   {
//     id: "yes-bank-2026",
//     bankName: "YES Bank",
//     loanType: "Personal Loan",
//     netDisbursedAmount: 1_265_991,
//     processingFee: 34_009,
//     apr: 13.08,
//     tenureMonths: 60,
//     standardEmi: 28_723,
//     finalEmi: 40_161,
//     emiDueDay: 7,
//     emiStartDate: "2026-08-07",
//     disbursementDate: "2026-06-23",
//     status: "Active",
//     accentColor: "#2563eb",
//     paidEmis: 0,
//   },
//   {
//     id: "icici-2026",
//     bankName: "ICICI Bank",
//     loanType: "Personal Loan",
//     netDisbursedAmount: 991_501,
//     processingFee: 8_499,
//     apr: 11.65,
//     tenureMonths: 60,
//     standardEmi: 22_154,
//     finalEmi: 22_062,
//     emiDueDay: 5,
//     emiStartDate: "2026-08-05",
//     disbursementDate: "2026-06-23",
//     status: "Active",
//     accentColor: "#7c3aed",
//     paidEmis: 0,
//   },
// ]

// ─── API Transform Helpers ────────────────────────────────────────────────────

function transformApiLoan(raw: any): Loan {
  return {
    id:                 String(raw.id),
    bankName:           raw.lender_name || raw.loan_name,
    loanType:           "Personal Loan",
    netDisbursedAmount: parseFloat(raw.principal_amount),
    processingFee:      0,
    apr:                parseFloat(raw.interest_rate) * 100,   // API stores decimal e.g. 0.1165
    tenureMonths:       parseInt(raw.tenure_months),
    standardEmi:        parseFloat(raw.emi_amount),
    finalEmi:           parseFloat(raw.final_emi_amount) || parseFloat(raw.emi_amount),
    emiDueDay:          parseInt(raw.emi_start_date?.split("-")[2] || "7"),
    emiStartDate:       raw.emi_start_date,
    disbursementDate:   raw.disbursement_date,
    status:             raw.status === "active" ? "Active" : raw.status === "closed" ? "Closed" : "Foreclosed" as LoanStatus,
    accentColor:        raw.color || "#2563eb",
    paidEmis:           parseInt(raw.tenure_months) - parseInt(raw.remaining_emis),
  }
}

function transformApiSchedule(rows: any[]): EmiRow[] {
  const today = new Date()
  return rows.map((r) => ({
    emiNo:          r.emi_number,
    dueDate:        r.due_date,
    emiAmount:      parseFloat(r.emi_amount),
    principal:      parseFloat(r.principal_component),
    interest:       parseFloat(r.interest_component),
    openingBalance: parseFloat(r.opening_balance),
    closingBalance: parseFloat(r.closing_balance),
    status:         r.status === "paid" ? "paid"
                  : new Date(r.due_date) < today ? "overdue"
                  : "upcoming" as EmiStatus,
  }))
}

// ─── Amortization Engine ──────────────────────────────────────────────────────

function buildSchedule(loan: Loan): EmiRow[] {
  const r     = loan.apr / 100 / 12
  const today = new Date()
  let balance = loan.netDisbursedAmount
  const rows: EmiRow[] = []

  for (let i = 1; i <= loan.tenureMonths; i++) {
    const isLast    = i === loan.tenureMonths
    const emiAmt    = isLast ? loan.finalEmi : loan.standardEmi
    const interest  = Math.round(balance * r)
    const principal = emiAmt - interest
    const opening   = balance
    balance         = Math.max(0, Math.round(balance - principal))

    const dueDate    = addMonths(parseISO(loan.emiStartDate), i - 1)
    const dueDateStr = format(dueDate, "yyyy-MM-dd")

    let status: EmiStatus = "upcoming"
    if (i <= loan.paidEmis)            status = "paid"
    else if (dueDate < today)          status = "overdue"

    rows.push({
      emiNo:          i,
      dueDate:        dueDateStr,
      emiAmount:      emiAmt,
      principal,
      interest,
      openingBalance: Math.round(opening),
      closingBalance: balance,
      status,
    })
  }
  return rows
}

function calcPrepaymentImpact(
  outstanding: number,
  apr: number,
  remainingMonths: number,
  currentEmi: number,
  prepayment: number,
  mode: "reduce_tenure" | "reduce_emi",
) {
  const r          = apr / 100 / 12
  const newBalance = outstanding - prepayment
  if (newBalance <= 0 || prepayment <= 0) return null

  const oldRemainingInterest = currentEmi * remainingMonths - outstanding

  let newEmi    = currentEmi
  let newTenure = remainingMonths

  if (mode === "reduce_tenure") {
    // Same EMI — solve for new tenure: n = -ln(1 − r·P/E) / ln(1+r)
    const x = 1 - (r * newBalance) / currentEmi
    newTenure = x <= 0 ? 1 : Math.ceil(-Math.log(x) / Math.log(1 + r))
  } else {
    // Same tenure — solve for new EMI: E = P·r·(1+r)^n / ((1+r)^n − 1)
    const factor = Math.pow(1 + r, remainingMonths)
    newEmi = Math.round((newBalance * r * factor) / (factor - 1))
  }

  const newRemainingInterest =
    mode === "reduce_tenure"
      ? currentEmi * newTenure - newBalance
      : newEmi * remainingMonths - newBalance

  const interestSaved = Math.max(0, Math.round(oldRemainingInterest - newRemainingInterest))

  return { newEmi: Math.round(newEmi), newTenure, interestSaved }
}

// ─── Format Helpers ───────────────────────────────────────────────────────────

const fmtINR  = (n: number) => "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN")
const fmtDate = (s: string) => format(parseISO(s), "dd MMM yyyy")
const ordinal = (d: number) => `${d}${d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"}`

// ─── Tiny shared components ───────────────────────────────────────────────────

function LoanStatusBadge({ status }: { status: LoanStatus }) {
  const cls: Record<LoanStatus, string> = {
    Active:     "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    Closed:     "bg-blue-100 text-blue-800",
    Foreclosed: "bg-orange-100 text-orange-800",
  }
  return <Badge className={`${cls[status]} font-semibold`}>{status}</Badge>
}

function EmiStatusBadge({ status }: { status: EmiStatus }) {
  const cls: Record<EmiStatus, string> = {
    upcoming: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    paid:     "bg-emerald-100 text-emerald-800",
    overdue:  "bg-red-100 text-red-800",
  }
  const label: Record<EmiStatus, string> = { upcoming: "Upcoming", paid: "Paid", overdue: "Overdue" }
  return <Badge className={`${cls[status]} text-xs font-medium`}>{label[status]}</Badge>
}

function KpiTile({
  label, value, sub, valueClass = "text-foreground",
}: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground uppercase tracking-wider leading-none">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-2 ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ─── Add Loan Form ────────────────────────────────────────────────────────────

const ACCENT_COLORS = [
  { label: "Blue",   value: "#2563eb" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Teal",   value: "#0d9488" },
  { label: "Rose",   value: "#e11d48" },
  { label: "Amber",  value: "#d97706" },
]

const BLANK_FORM = {
  bankName:            "",
  loanType:            "Personal Loan",
  netDisbursedAmount:  "",
  processingFee:       "",
  apr:                 "",
  tenureMonths:        "",
  standardEmi:         "",
  finalEmi:            "",
  emiDueDay:           "7",
  emiStartDate:        "",
  disbursementDate:    "",
  accentColor:         "#2563eb",
}

type FormState = typeof BLANK_FORM

function calcEmi(p: number, apr: number, n: number) {
  if (!p || !apr || !n) return 0
  const r = apr / 100 / 12
  if (r === 0) return Math.round(p / n)
  const factor = Math.pow(1 + r, n)
  return Math.round((p * r * factor) / (factor - 1))
}

function AddLoanDialog({
  onSuccess,
}: {
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(BLANK_FORM)

  const set = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  // Auto-compute EMI whenever principal / rate / tenure change
  const computedEmi = useMemo(() =>
    calcEmi(Number(form.netDisbursedAmount), Number(form.apr), Number(form.tenureMonths)),
    [form.netDisbursedAmount, form.apr, form.tenureMonths],
  )

  const handleSubmit = async () => {
    const emi = Number(form.standardEmi) || computedEmi
    try {
      const res = await apiClient(apiUrl("/loans/store"), {
        method: "POST",
        body: JSON.stringify({
          loan_name: `${form.bankName.trim()} ${form.loanType}`,
          lender_name: form.bankName.trim() || "Unknown Bank",
          principal_amount: Number(form.netDisbursedAmount),
          disbursement_date: form.disbursementDate,
          interest_rate: Number(form.apr) / 100,   // convert % to decimal
          tenure_months: Number(form.tenureMonths),
          emi_amount: emi,
          final_emi_amount: Number(form.finalEmi) || emi,
          emi_start_date: form.emiStartDate,
          color: form.accentColor,
        }),
      })
      if (res.ok) {
        onSuccess()
        setForm(BLANK_FORM)
        setOpen(false)
      }
    } catch (e) {
      console.error("Failed to save loan", e)
    }
  }

  const isValid =
    form.bankName.trim() &&
    Number(form.netDisbursedAmount) > 0 &&
    Number(form.apr) > 0 &&
    Number(form.tenureMonths) > 0 &&
    form.emiStartDate &&
    form.disbursementDate

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-black text-white hover:bg-gray-800 gap-1.5">
          <Plus className="h-4 w-4" /> Add Loan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>Add New Loan</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Bank & type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bank / Lender Name *</Label>
              <Input placeholder="e.g. YES Bank" value={form.bankName} onChange={e => set("bankName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Loan Type</Label>
              <Select value={form.loanType} onValueChange={v => set("loanType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Personal Loan","Home Loan","Car Loan","Education Loan","Gold Loan","Other"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Net Disbursed Amount (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input className="pl-9" placeholder="12,65,991" inputMode="numeric"
                  value={form.netDisbursedAmount} onChange={e => set("netDisbursedAmount", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Processing Fee (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input className="pl-9" placeholder="0" inputMode="numeric"
                  value={form.processingFee} onChange={e => set("processingFee", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Rate & tenure */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">APR / Interest Rate (%) *</Label>
              <Input placeholder="13.08" inputMode="decimal"
                value={form.apr} onChange={e => set("apr", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Tenure (Months) *</Label>
              <Input placeholder="60" inputMode="numeric"
                value={form.tenureMonths} onChange={e => set("tenureMonths", e.target.value)} />
            </div>
          </div>

          {/* EMI fields — auto-computed but editable */}
          <div className="rounded-xl border bg-muted/30 p-3.5 space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">EMI Details</p>
            {computedEmi > 0 && (
              <p className="text-xs text-blue-600">
                Auto-computed EMI: <span className="font-bold">{fmtINR(computedEmi)}</span> — override below if KFS shows different.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Standard EMI (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input className="pl-9" placeholder={computedEmi ? String(computedEmi) : "28,723"} inputMode="numeric"
                    value={form.standardEmi} onChange={e => set("standardEmi", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Final EMI (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input className="pl-9" placeholder="40,161 (if different)" inputMode="numeric"
                    value={form.finalEmi} onChange={e => set("finalEmi", e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Disbursement Date *</Label>
              <Input type="date" value={form.disbursementDate} onChange={e => set("disbursementDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">First EMI Date *</Label>
              <Input type="date" value={form.emiStartDate} onChange={e => set("emiStartDate", e.target.value)} />
            </div>
          </div>

          {/* Due day + color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">EMI Due Day of Month</Label>
              <Input placeholder="7" inputMode="numeric" max="31" min="1"
                value={form.emiDueDay} onChange={e => set("emiDueDay", e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Day of month EMI is due (e.g. 7 = 7th)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Card Color</Label>
              <div className="flex gap-2 mt-1">
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => set("accentColor", c.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.accentColor === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setForm(BLANK_FORM); setOpen(false) }}>Cancel</Button>
          <Button
            className="bg-black text-white hover:bg-gray-800"
            disabled={!isValid}
            onClick={handleSubmit}
          >
            Add Loan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Overview: top-level loan list ───────────────────────────────────────────

function LoansOverview({
  loans, onSelect, onAddSuccess,
}: { loans: Loan[]; onSelect: (id: string) => void; onAddSuccess: () => void }) {
  const totalOutstanding = useMemo(
    () => loans.filter(l => l.status === "Active")
               .reduce((s, l) => s + l.netDisbursedAmount - (buildSchedule(l).slice(0, l.paidEmis).reduce((a, r) => a + r.principal, 0)), 0),
    [loans],
  )
  const totalMonthlyEmi  = loans.filter(l => l.status === "Active").reduce((s, l) => s + l.standardEmi, 0)
  const activeCount      = loans.filter(l => l.status === "Active").length

  return (
    <div className="space-y-6">
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Loan Portfolio</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track your loans, EMI schedule &amp; repayment progress</p>
        </div>
        <AddLoanDialog onSuccess={onAddSuccess} />
      </div>

      {/* ── Top 3 summary cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiTile
          label="Total Outstanding"
          value={fmtINR(totalOutstanding)}
          sub={`Across ${activeCount} active loan${activeCount !== 1 ? "s" : ""}`}
          valueClass="text-rose-600"
        />
        <KpiTile
          label="Monthly EMI Commitment"
          value={fmtINR(totalMonthlyEmi)}
          sub="Combined EMI due each month"
          valueClass="text-amber-600"
        />
        <KpiTile
          label="Active Loans"
          value={String(activeCount)}
          sub="Currently being repaid"
          valueClass="text-blue-600"
        />
      </div>

      {/* ── Loan cards ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {loans.map(loan => {
          const schedule = buildSchedule(loan)
          const totalPayable = schedule.reduce((s, r) => s + r.emiAmount, 0)
          const paidPrincipal = schedule.slice(0, loan.paidEmis).reduce((s, r) => s + r.principal, 0)
          const outstanding = loan.netDisbursedAmount - paidPrincipal
          const paidAmount  = schedule.slice(0, loan.paidEmis).reduce((s, r) => s + r.emiAmount, 0)
          const progressPct = (paidAmount / totalPayable) * 100
          const nextEmi     = schedule[loan.paidEmis]
          const totalInterest = totalPayable - loan.netDisbursedAmount

          return (
            <Card key={loan.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Accent strip */}
              <div className="h-1 w-full" style={{ backgroundColor: loan.accentColor }} />
              <CardContent className="p-5">

                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                         style={{ backgroundColor: loan.accentColor + "20" }}>
                      <Landmark className="h-5 w-5" style={{ color: loan.accentColor }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base leading-tight">{loan.bankName}</h3>
                        <LoanStatusBadge status={loan.status} />
                        {loan.isPlaceholder && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            KFS Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {loan.loanType} · Disbursed {fmtDate(loan.disbursementDate)} · APR {loan.apr}%
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => onSelect(loan.id)}
                  >
                    View Details <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* 4 key metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Net Disbursed",  value: fmtINR(loan.netDisbursedAmount), color: "text-foreground" },
                    { label: "Outstanding",     value: fmtINR(outstanding),              color: "text-rose-600" },
                    { label: "Monthly EMI",     value: fmtINR(loan.standardEmi),         color: "text-foreground" },
                    { label: "Total Interest",  value: fmtINR(totalInterest),            color: "text-amber-600" },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl bg-muted/40 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                      <p className={`text-sm font-bold tabular-nums mt-0.5 ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Repayment progress</span>
                    <span className="font-medium">{progressPct.toFixed(1)}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Paid: {fmtINR(paidAmount)}</span>
                    <span>Remaining: {fmtINR(totalPayable - paidAmount)}</span>
                  </div>
                </div>

                {/* Next EMI footer */}
                {nextEmi && (
                  <div className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-xs">
                    <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Next EMI:</span>
                    <span className="font-semibold">{fmtDate(nextEmi.dueDate)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-semibold" style={{ color: loan.accentColor }}>{fmtINR(nextEmi.emiAmount)}</span>
                    <EmiStatusBadge status={nextEmi.status} />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── Detail: full loan deep-dive ──────────────────────────────────────────────

function LoanDetail({
  loan, onBack, apiSchedule,
}: {
  loan: Loan
  onBack: () => void
  apiSchedule?: EmiRow[]
}) {
  const schedule = useMemo(
    () => apiSchedule?.length ? apiSchedule : buildSchedule(loan),
    [loan, apiSchedule],
  )

  const totalPayable    = schedule.reduce((s, r) => s + r.emiAmount, 0)
  const totalInterest   = totalPayable - loan.netDisbursedAmount
  const paidPrincipal   = schedule.slice(0, loan.paidEmis).reduce((s, r) => s + r.principal, 0)
  const paidInterest    = schedule.slice(0, loan.paidEmis).reduce((s, r) => s + r.interest,  0)
  const paidAmount      = schedule.slice(0, loan.paidEmis).reduce((s, r) => s + r.emiAmount, 0)
  const outstanding     = loan.netDisbursedAmount - paidPrincipal
  const remainingAmount = totalPayable - paidAmount
  const progressPct     = (paidAmount / totalPayable) * 100
  const remainingMonths = loan.tenureMonths - loan.paidEmis
  const nextEmi         = schedule[loan.paidEmis]

  // Prepayment calculator state
  const [prepayAmt,  setPrepayAmt]  = useState("")
  const [prepayMode, setPrepayMode] = useState<"reduce_tenure" | "reduce_emi">("reduce_tenure")
  const [impact,     setImpact]     = useState<ReturnType<typeof calcPrepaymentImpact>>(null)

  const handleCalcImpact = () => {
    const amt = Number(prepayAmt.replace(/,/g, ""))
    setImpact(calcPrepaymentImpact(outstanding, loan.apr, remainingMonths, loan.standardEmi, amt, prepayMode))
  }

  const tabCls = "data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black data-[state=active]:shadow-sm"

  return (
    <div className="space-y-5">

      {/* ── Back + loan header ──────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="mt-0.5 shrink-0 gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{loan.bankName} — {loan.loanType}</h2>
            <LoanStatusBadge status={loan.status} />
            {loan.isPlaceholder && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                KFS Pending — data is approximate
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Net Disbursed {fmtINR(loan.netDisbursedAmount)} · APR {loan.apr}% ·
            {loan.tenureMonths} months · EMI due {ordinal(loan.emiDueDay)} every month
          </p>
        </div>
      </div>

      {/* ── 4 hero KPIs ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile label="Outstanding Principal" value={fmtINR(outstanding)}                    sub={`${remainingMonths} months left`}     valueClass="text-rose-600" />
        <KpiTile label="Amount Paid"            value={fmtINR(paidAmount)}                    sub={`${loan.paidEmis} of ${loan.tenureMonths} EMIs`} />
        <KpiTile label="Next EMI"               value={nextEmi ? fmtINR(nextEmi.emiAmount) : "—"} sub={nextEmi ? fmtDate(nextEmi.dueDate) : "All paid"} valueClass="text-blue-600" />
        <KpiTile label="Remaining Payable"      value={fmtINR(remainingAmount)}               sub="Including future interest"           valueClass="text-amber-600" />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs defaultValue="summary">
        <TabsList className="grid w-full grid-cols-4">
          {["summary","schedule","history","prepayment"].map(t => (
            <TabsTrigger key={t} value={t} className={tabCls}>
              {t === "summary" ? "Summary" : t === "schedule" ? "EMI Schedule" : t === "history" ? "Payment History" : "Part Payment"}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Summary ─────────────────────────────────────────────────── */}
        <TabsContent value="summary" className="space-y-5 mt-4">

          {/* Loan details grid */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Loan Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x">
                {/* Left column */}
                <div className="space-y-0 pr-0 sm:pr-6 divide-y">
                  {[
                    { l: "Net Disbursed Amount",   v: fmtINR(loan.netDisbursedAmount) },
                    { l: "Processing Fee",          v: fmtINR(loan.processingFee) },
                    { l: "Annual Percentage Rate",  v: `${loan.apr}%` },
                    { l: "Loan Tenure",             v: `${loan.tenureMonths} months (${Math.floor(loan.tenureMonths/12)} yr ${loan.tenureMonths%12} mo)` },
                    { l: "EMI Due Date",            v: `${ordinal(loan.emiDueDay)} of every month` },
                    { l: "First EMI Date",          v: fmtDate(loan.emiStartDate) },
                  ].map(row => (
                    <div key={row.l} className="flex justify-between items-center py-2.5 text-sm">
                      <span className="text-muted-foreground">{row.l}</span>
                      <span className="font-medium tabular-nums">{row.v}</span>
                    </div>
                  ))}
                </div>
                {/* Right column */}
                <div className="space-y-0 pl-0 sm:pl-6 divide-y">
                  {[
                    { l: "Total Payable Amount",   v: fmtINR(totalPayable),   cls: "" },
                    { l: "Total Interest Payable", v: fmtINR(totalInterest),  cls: "text-amber-600" },
                    { l: "Outstanding Principal",  v: fmtINR(outstanding),    cls: "text-rose-600" },
                    { l: "Amount Paid",            v: fmtINR(paidAmount),     cls: "text-emerald-600" },
                    { l: "Remaining Amount",       v: fmtINR(remainingAmount), cls: "" },
                    { l: "EMIs Remaining",         v: `${remainingMonths} of ${loan.tenureMonths}`, cls: "" },
                  ].map(row => (
                    <div key={row.l} className="flex justify-between items-center py-2.5 text-sm">
                      <span className="text-muted-foreground">{row.l}</span>
                      <span className={`font-bold tabular-nums ${row.cls}`}>{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Repayment progress */}
          <Card className="shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Repayment Progress</span>
                <span className="font-bold">{progressPct.toFixed(1)}%</span>
              </div>
              <Progress value={progressPct} className="h-3 rounded-full" />
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { label: "Principal Paid",    value: fmtINR(paidPrincipal), color: "#2563eb" },
                  { label: "Interest Paid",     value: fmtINR(paidInterest),  color: "#f59e0b" },
                  { label: "Principal Remaining", value: fmtINR(outstanding), color: "#ef4444" },
                ].map(m => (
                  <div key={m.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">{m.label}</p>
                      <p className="text-sm font-bold tabular-nums">{m.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Principal vs Interest split visual */}
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm font-medium mb-3">Total Cost Breakdown</p>
              <div className="flex items-center gap-0 rounded-full overflow-hidden h-5 mb-3">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${(loan.netDisbursedAmount / totalPayable) * 100}%` }}
                  title={`Principal ${fmtINR(loan.netDisbursedAmount)}`}
                />
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${(totalInterest / totalPayable) * 100}%` }}
                  title={`Interest ${fmtINR(totalInterest)}`}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  Principal {fmtINR(loan.netDisbursedAmount)} ({((loan.netDisbursedAmount/totalPayable)*100).toFixed(1)}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  Interest {fmtINR(totalInterest)} ({((totalInterest/totalPayable)*100).toFixed(1)}%)
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EMI Schedule ────────────────────────────────────────────── */}
        <TabsContent value="schedule" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Amortization Schedule
                </CardTitle>
                <span className="text-xs text-muted-foreground">{loan.tenureMonths} EMIs total</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="max-h-[480px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow>
                        <TableHead className="w-12 text-center">No.</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">EMI</TableHead>
                        <TableHead className="text-right">Principal</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map(row => (
                        <TableRow
                          key={row.emiNo}
                          className={row.status === "paid" ? "opacity-50" : row.status === "overdue" ? "bg-red-50/50 dark:bg-red-950/20" : ""}
                        >
                          <TableCell className="text-center text-muted-foreground text-xs font-mono">{row.emiNo}</TableCell>
                          <TableCell className="text-sm tabular-nums">{fmtDate(row.dueDate)}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-sm">{fmtINR(row.emiAmount)}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-blue-600">{fmtINR(row.principal)}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-amber-600">{fmtINR(row.interest)}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-rose-600">{fmtINR(row.closingBalance)}</TableCell>
                          <TableCell className="text-center"><EmiStatusBadge status={row.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payment History ──────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4">
          {loan.paidEmis === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No payments yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    First EMI is due on {nextEmi ? fmtDate(nextEmi.dueDate) : "—"}
                  </p>
                </div>
                {nextEmi && (
                  <div className="mt-2 rounded-xl border px-4 py-3 text-sm text-center">
                    <p className="text-muted-foreground text-xs mb-1">Upcoming EMI</p>
                    <p className="font-bold text-lg">{fmtINR(nextEmi.emiAmount)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ₹{nextEmi.principal.toLocaleString("en-IN")} principal + ₹{nextEmi.interest.toLocaleString("en-IN")} interest
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.slice(0, loan.paidEmis).map(row => (
                      <TableRow key={row.emiNo}>
                        <TableCell className="text-sm">{fmtDate(row.dueDate)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmtINR(row.emiAmount)}</TableCell>
                        <TableCell className="text-right tabular-nums text-blue-600">{fmtINR(row.principal)}</TableCell>
                        <TableCell className="text-right tabular-nums text-amber-600">{fmtINR(row.interest)}</TableCell>
                        <TableCell className="text-right tabular-nums text-rose-600">{fmtINR(row.closingBalance)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-emerald-800 text-xs">Paid</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Part Payment ─────────────────────────────────────────────── */}
        <TabsContent value="prepayment" className="mt-4 space-y-4">

          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3.5 text-sm">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-blue-800 dark:text-blue-200">
              Part payment directly reduces your outstanding principal. You can choose to either reduce your EMI amount
              (keeping tenure the same) or reduce tenure (keeping EMI the same). The calculator below shows the
              impact before you make a payment.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Calculator input */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Prepayment Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Extra Payment Amount</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="e.g. 2,00,000"
                      value={prepayAmt}
                      onChange={e => setPrepayAmt(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current outstanding: <span className="font-semibold text-rose-600">{fmtINR(outstanding)}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">After Part Payment, I want to</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: "reduce_tenure", title: "Reduce Tenure", desc: "Keep EMI same, close loan earlier, save more interest" },
                      { value: "reduce_emi",    title: "Reduce EMI",    desc: "Keep tenure same, pay smaller EMI each month" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPrepayMode(opt.value as "reduce_tenure" | "reduce_emi")}
                        className={`text-left rounded-xl border p-3 transition-all ${prepayMode === opt.value ? "border-black bg-black/5 dark:border-white dark:bg-white/5" : "border-muted hover:border-muted-foreground"}`}
                      >
                        <p className={`text-sm font-semibold ${prepayMode === opt.value ? "text-foreground" : "text-muted-foreground"}`}>
                          {opt.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 bg-black text-white hover:bg-gray-800" onClick={handleCalcImpact}>
                    Calculate Impact
                  </Button>
                  {impact && (
                    <Button
                      variant="outline"
                      className="gap-1.5"
                      onClick={async () => {
                        try {
                          const res = await apiClient(apiUrl(`/loans/${loan.id}/part-payment`), {
                            method: "POST",
                            body: JSON.stringify({
                              amount_paid: Number(prepayAmt.replace(/,/g, "")),
                              recalculation_mode: prepayMode,
                              payment_date: new Date().toISOString().split("T")[0],
                            }),
                          })
                          if (res.ok) {
                            onBack()
                          }
                        } catch (e) {
                          console.error("Failed to submit part payment", e)
                        }
                      }}
                    >
                      Submit Part Payment
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Impact result */}
            <Card className={`shadow-sm transition-opacity ${impact ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-emerald-600" /> Impact Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {impact ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Current EMI",      before: fmtINR(loan.standardEmi), after: prepayMode === "reduce_emi" ? fmtINR(impact.newEmi) : fmtINR(loan.standardEmi), changed: prepayMode === "reduce_emi" },
                        { label: "Remaining Tenure", before: `${remainingMonths} months`, after: `${impact.newTenure} months`, changed: prepayMode === "reduce_tenure" },
                      ].map(m => (
                        <div key={m.label} className="rounded-xl border p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">{m.label}</p>
                          <p className="text-xs text-muted-foreground line-through">{m.before}</p>
                          <p className={`text-base font-bold tabular-nums ${m.changed ? "text-emerald-600" : ""}`}>{m.after}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Interest Saved</p>
                      </div>
                      <p className="text-2xl font-bold tabular-nums text-emerald-600">{fmtINR(impact.interestSaved)}</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                        {prepayMode === "reduce_tenure"
                          ? `Loan closes ${remainingMonths - impact.newTenure} months early`
                          : `EMI reduces by ${fmtINR(loan.standardEmi - impact.newEmi)} / month`}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground space-y-0.5">
                      <p>• New outstanding after payment: <span className="font-semibold text-foreground">{fmtINR(outstanding - Number(prepayAmt.replace(/,/g, "")))}</span></p>
                      <p>• All calculations are estimates based on reducing balance method.</p>
                      <p>• Actual figures may vary due to bank-specific processing dates.</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <Calculator className="h-8 w-8 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">Enter an amount and click Calculate Impact</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preclosure info */}
          <Card className="shadow-sm border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-200">Preclosure / Full Settlement</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Full preclosure calculates your outstanding principal + foreclosure charges + applicable GST.
                  This feature will be enabled once the loan has at least one EMI payment on record.
                  Current outstanding for settlement: <span className="font-bold">{fmtINR(outstanding)}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function LoansTab() {
  const [loans,      setLoans]      = useState<Loan[]>([])
  const [loading,    setLoading]    = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [schedules,  setSchedules]  = useState<Record<string, EmiRow[]>>({})

  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient(apiUrl("/loans/listing"))
      if (res.ok) {
        const json = await res.json()
        if (json.data?.length) {
          setLoans(json.data.map(transformApiLoan))
        }
      }
    } catch (e) {
      console.error("Failed to fetch loans", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  const fetchSchedule = useCallback(async (loanId: string) => {
    if (schedules[loanId]) return  // already cached
    try {
      const res = await apiClient(apiUrl(`/loans/${loanId}/schedule`))
      if (res.ok) {
        const json = await res.json()
        setSchedules(prev => ({ ...prev, [loanId]: transformApiSchedule(json.data || []) }))
      }
    } catch (e) {
      console.error("Failed to fetch schedule", e)
    }
  }, [schedules])

  const handleSelect = (id: string) => {
    setSelectedId(id)
    fetchSchedule(id)
  }

  const selectedLoan = loans.find(l => l.id === selectedId) ?? null

  return selectedLoan
    ? (
      <LoanDetail
        loan={selectedLoan}
        onBack={() => setSelectedId(null)}
        apiSchedule={schedules[selectedLoan.id]}
      />
    )
    : (
      <LoansOverview
        loans={loans}
        onSelect={handleSelect}
        onAddSuccess={fetchLoans}
      />
    )
}
