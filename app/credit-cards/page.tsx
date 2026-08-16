"use client"

/**
 * Credit Cards — every card's due AND its running spend, at once.
 *
 * The reference mobile app toggles between "Total Due" and "Recent Spends"
 * because a phone can't show both. On a wide screen that constraint doesn't
 * exist, so this shows them side by side per card instead: one glance
 * answers "what do I owe" and "what's building up for next month" without
 * a toggle. Each tile also surfaces two things the data always had but
 * nothing ever displayed — credit utilization against card_limit, and a
 * six-cycle spend sparkline — plus days-until-due urgency.
 *
 * Two tabs: Cards (this) and Statement History (the any-card/any-cycle
 * browser — a deliberate deep-dive, kept out of the way of the daily view).
 *
 * Backed by GET /credit-cards/overview and GET /credit-cards/:id/detail.
 * The open/closed cycle split is computed server-side via the same
 * billing-day rollover math transactionService.addTransaction uses at write
 * time, so "today's open cycle" can never drift from how transactions
 * actually get bucketed.
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import AppShell from "@/components/app-shell"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState, SkeletonText, SkeletonRows, InlineSpinner } from "@/components/ui/states"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CreditCard as CreditCardIcon, ArrowLeft, AlertTriangle } from "lucide-react"
import { format, parseISO, differenceInCalendarDays } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import CreditCardCycleBrowser from "@/components/credit-card-cycle-browser"

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrendPoint {
  dueDate: string
  amount: number
}

interface CardDue {
  amount: number
  /** Before any carried-forward credit was applied. */
  grossAmount?: number
  /** Credit carried in from an earlier cycle that reduced this bill. */
  creditApplied?: number
  dueDate: string
  paymentId: number
  hasOlderPending?: boolean
}

interface OverviewCard {
  id: number
  cardName: string
  cardLimit: number
  billingCycleDate: number
  dueDays: number
  outstanding: number
  /** Unused credit sitting on the card, waiting to offset future spend. */
  creditBalance: number
  utilization: number | null
  due: CardDue | null
  openCycle: { since: string; amount: number; creditIn: number; transactionCount: number }
  trend: TrendPoint[]
}

interface Overview {
  cards: OverviewCard[]
  totals: {
    totalDue: number
    cardsWithDue: number
    totalRecentSpend: number
    totalCreditBalance: number
    totalLimit: number
    totalOutstanding: number
    overallUtilization: number | null
  }
}

interface CycleTransaction {
  id: number
  description: string
  category: string
  amount: number
  transactionDate: string | null
  purpose?: string | null
  status: string
  txnKind?: "purchase" | "refund" | "cashback"
  refundForId?: number | null
}

interface CategorySlice {
  category: string
  amount: number
  percent: number
}

interface Statement {
  dueDate: string
  amount: number
  payable: number
  creditApplied: number
  spends: number
  credits: number
  status: "Paid" | "Pending"
  paymentDate: string | null
  paymentId: number
  transactionCount: number
  transactions: CycleTransaction[]
}

interface CardDetail {
  card: { id: number; cardName: string; cardLimit: number; billingCycleDate: number; dueDays: number }
  due: {
    amount: number
    grossAmount?: number
    creditApplied?: number
    dueDate: string
    paymentId: number
  } | null
  openCycle: {
    since: string
    dueDate: string
    amount: number
    creditIn: number
    spends: number
    credits: number
    transactions: CycleTransaction[]
    categoryBreakdown: CategorySlice[]
  }
  statements: Statement[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`
const fmtDate = (s: string | null | undefined) => {
  if (!s) return "—"
  try {
    return format(parseISO(s), "d MMM yyyy")
  } catch {
    return s
  }
}
const todayISO = () => format(new Date(), "yyyy-MM-dd")

/** Days until a due date, and the tone that should carry. */
function dueUrgency(dueDate: string) {
  let days: number
  try {
    days = differenceInCalendarDays(parseISO(dueDate), new Date())
  } catch {
    return { days: null, label: "", tone: "muted" as const }
  }
  if (days < 0) return { days, label: `Overdue by ${Math.abs(days)}d`, tone: "danger" as const }
  if (days === 0) return { days, label: "Due today", tone: "danger" as const }
  if (days <= 3) return { days, label: `Due in ${days}d`, tone: "danger" as const }
  if (days <= 7) return { days, label: `Due in ${days}d`, tone: "warn" as const }
  return { days, label: `Due in ${days}d`, tone: "muted" as const }
}

const toneText = {
  danger: "text-destructive-text",
  warn: "text-warning-text",
  muted: "text-muted-foreground",
} as const

/** Utilization above 30% is the conventional credit-score threshold. */
function utilizationTone(pct: number | null) {
  if (pct == null) return "bg-muted-foreground/40"
  if (pct >= 70) return "bg-destructive"
  if (pct >= 30) return "bg-warning"
  return "bg-success"
}

// ─── Sparkline ──────────────────────────────────────────────────────────────

/**
 * Six-bar spend history. Deliberately tiny and axis-less — the question it
 * answers is "is this month unusual?", not "what exactly was March?".
 */
function Sparkline({ points, className }: { points: TrendPoint[]; className?: string }) {
  if (points.length < 2) return null
  const max = Math.max(...points.map((p) => p.amount), 1)
  return (
    <div className={cn("flex items-end gap-1 h-8", className)} aria-hidden="true">
      {points.map((p, i) => (
        <div
          key={p.dueDate}
          title={`${fmtDate(p.dueDate)} · ${fmtINR(p.amount)}`}
          className={cn(
            "flex-1 rounded-sm min-h-[2px]",
            i === points.length - 1 ? "bg-primary/70" : "bg-muted-foreground/25",
          )}
          style={{ height: `${Math.max(6, (p.amount / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

// ─── Card tile ──────────────────────────────────────────────────────────────

function CardTile({
  card,
  onOpen,
  onPay,
  paying,
}: {
  card: OverviewCard
  onOpen: () => void
  onPay: () => void
  paying: boolean
}) {
  const urgency = card.due ? dueUrgency(card.due.dueDate) : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group cursor-pointer rounded-2xl border bg-card p-5 shadow-sm text-left transition-colors hover:border-foreground/20 hover:bg-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{card.cardName}</p>
            <p className="text-xs text-muted-foreground">Bills on {card.billingCycleDate}</p>
          </div>
        </div>
        {card.due?.hasOlderPending && (
          <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
            <AlertTriangle className="h-3 w-3" />
            Older unpaid
          </Badge>
        )}
      </div>

      {/* The two numbers, side by side — the whole point of this layout */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Due</p>
          <p
            className={cn(
              "text-xl font-bold tnum mt-1",
              !card.due && (card.creditBalance > 0 ? "text-success-text" : "text-muted-foreground"),
            )}
          >
            {card.due ? fmtINR(card.due.amount) : card.creditBalance > 0 ? fmtINR(card.creditBalance) : "—"}
          </p>
          <p className={cn("text-xs mt-0.5", urgency ? toneText[urgency.tone] : "text-muted-foreground")}>
            {card.due && urgency
              ? `${fmtDate(card.due.dueDate)} · ${urgency.label}`
              : card.creditBalance > 0
                ? "in credit"
                : "No dues"}
          </p>
          {/* A bill that shrank because of a credit should say so, or it
              just looks like the statement was wrong. */}
          {card.due && (card.due.creditApplied ?? 0) > 0 && (
            <p className="text-[11px] text-success-text mt-0.5">
              {fmtINR(card.due.creditApplied!)} credit applied
            </p>
          )}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Recent Spends</p>
          <p
            className={cn(
              "text-xl font-bold tnum mt-1",
              card.openCycle.amount < 0 && "text-success-text",
            )}
          >
            {card.openCycle.amount < 0
              ? `${fmtINR(Math.abs(card.openCycle.amount))} back`
              : fmtINR(card.openCycle.amount)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">since {fmtDate(card.openCycle.since)}</p>
        </div>
      </div>

      {/* Utilization */}
      {card.cardLimit > 0 && (
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {fmtINR(card.outstanding)} of {fmtINR(card.cardLimit)}
            </span>
            <span className="font-medium tnum">{card.utilization}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", utilizationTone(card.utilization))}
              style={{ width: `${Math.min(100, card.utilization ?? 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Trend + action */}
      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          {card.trend.length >= 2 && (
            <>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Last {card.trend.length} cycles
              </p>
              <Sparkline points={card.trend} />
            </>
          )}
        </div>
        {card.due && (
          <Button
            size="sm"
            disabled={paying}
            onClick={(e) => {
              e.stopPropagation()
              onPay()
            }}
          >
            {paying && <InlineSpinner className="mr-1.5" />}
            Pay now
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Transaction group ──────────────────────────────────────────────────────

function CycleGroup({
  title,
  amount,
  transactions,
  badge,
  spends,
  credits,
}: {
  title: string
  amount: number
  transactions: CycleTransaction[]
  badge?: { label: string; variant: "secondary" | "outline" } | null
  spends?: number
  credits?: number
}) {
  const hasCredits = (credits ?? 0) > 0
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          {badge && (
            <Badge variant={badge.variant} className="text-[10px]">
              {badge.label}
            </Badge>
          )}
        </div>
        <div className="text-right">
          <p className={cn("text-sm font-semibold tnum", amount < 0 && "text-success-text")}>
            {amount < 0 ? `${fmtINR(Math.abs(amount))} credit` : fmtINR(amount)}
          </p>
          {/* Show the arithmetic when credits are involved, so a smaller
              statement total is obviously explained rather than suspicious. */}
          {hasCredits && (
            <p className="text-[11px] text-muted-foreground tnum">
              {fmtINR(spends ?? 0)} spent − {fmtINR(credits ?? 0)} back
            </p>
          )}
        </div>
      </div>
      {transactions.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">No transactions</p>
      ) : (
        <div className="rounded-2xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const credit = t.txnKind === "refund" || t.txnKind === "cashback"
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {t.description}
                        {credit && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-success/30 text-[10px] text-success-text"
                          >
                            {t.txnKind === "refund" ? "Refund" : "Cashback"}
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.category}</TableCell>
                    <TableCell className="text-muted-foreground tnum">{fmtDate(t.transactionDate)}</TableCell>
                    {/* Credits are shown signed — a refund sitting in a
                        statement list at the same weight as a purchase is
                        the single easiest thing to misread here. */}
                    <TableCell
                      className={cn("text-right font-semibold tnum", credit && "text-success-text")}
                    >
                      {credit ? `− ${fmtINR(t.amount)}` : fmtINR(t.amount)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CreditCardsPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<"cards" | "history">("cards")

  const [overview, setOverview] = useState<Overview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)

  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
  const [detail, setDetail] = useState<CardDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [payAllOpen, setPayAllOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payingCardId, setPayingCardId] = useState<number | null>(null)

  const loadOverview = useCallback(() => {
    setOverviewLoading(true)
    apiClient(apiUrl("credit-cards/overview"))
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setOverview(json.data)
      })
      .catch(() => {})
      .finally(() => setOverviewLoading(false))
  }, [])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  const loadDetail = useCallback((cardId: number) => {
    setDetailLoading(true)
    apiClient(apiUrl(`credit-cards/${cardId}/detail`))
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setDetail(json.data)
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [])

  useEffect(() => {
    if (selectedCardId != null) loadDetail(selectedCardId)
    else setDetail(null)
  }, [selectedCardId, loadDetail])

  const cardOptions = useMemo(
    () => (overview?.cards || []).map((c) => ({ id: c.id, cardName: c.cardName })),
    [overview],
  )

  // ── Payment actions — reuses the same endpoint the existing per-transaction
  // Credit Card Payment dialog already calls; no new payment logic here. ──
  const payOne = async (paymentId: number) => {
    try {
      const res = await apiClient(apiUrl("transaction/payments/update-status"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: paymentId, payment_date: todayISO(), status: "Paid" }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  const handlePayCard = async (cardId: number, paymentId: number) => {
    setPayingCardId(cardId)
    const ok = await payOne(paymentId)
    setPayingCardId(null)
    if (ok) {
      toast({ title: "Payment recorded" })
      loadOverview()
      if (selectedCardId === cardId) loadDetail(cardId)
    } else {
      toast({ title: "Couldn't record payment", description: "Please try again.", variant: "destructive" })
    }
  }

  const handlePayAll = async () => {
    if (!overview) return
    const dues = overview.cards.filter((c) => c.due).map((c) => c.due!.paymentId)
    setPaying(true)
    const results = await Promise.all(dues.map(payOne))
    setPaying(false)
    setPayAllOpen(false)
    if (results.every(Boolean)) {
      toast({ title: `Marked ${dues.length} card${dues.length !== 1 ? "s" : ""} as paid` })
    } else {
      toast({
        title: "Some payments couldn't be recorded",
        description: "Check each card individually — the rest went through.",
        variant: "destructive",
      })
    }
    loadOverview()
  }

  // ── Card detail view ──────────────────────────────────────────────────────
  if (selectedCardId != null) {
    return (
      <AppShell title={detail?.card.cardName || "Card"} description="This statement and what's building up next">
        <div className="space-y-6">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCardId(null)} className="-ml-2">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All cards
          </Button>

          {detailLoading && <SkeletonText lines={5} />}

          {!detailLoading && detail && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border bg-card p-5 shadow-sm flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Due</p>
                    <p className="text-2xl font-bold tnum mt-1">{fmtINR(detail.due?.amount || 0)}</p>
                    {detail.due ? (
                      (() => {
                        const u = dueUrgency(detail.due.dueDate)
                        return (
                          <>
                            <p className={cn("text-xs mt-1", toneText[u.tone])}>
                              {fmtDate(detail.due.dueDate)} · {u.label}
                            </p>
                            {(detail.due.creditApplied ?? 0) > 0 && (
                              <p className="text-xs text-success-text mt-0.5">
                                {fmtINR(detail.due.grossAmount ?? 0)} statement −{" "}
                                {fmtINR(detail.due.creditApplied!)} credit
                              </p>
                            )}
                          </>
                        )
                      })()
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">Nothing outstanding</p>
                    )}
                  </div>
                  {detail.due && (
                    <Button
                      onClick={() => handlePayCard(detail.card.id, detail.due!.paymentId)}
                      disabled={payingCardId === detail.card.id}
                    >
                      {payingCardId === detail.card.id && <InlineSpinner className="mr-2" />}
                      Pay now
                    </Button>
                  )}
                </div>

                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Recent Spends</p>
                  <p
                    className={cn(
                      "text-2xl font-bold tnum mt-1",
                      detail.openCycle.amount < 0 && "text-success-text",
                    )}
                  >
                    {detail.openCycle.amount < 0
                      ? `${fmtINR(Math.abs(detail.openCycle.amount))} back`
                      : fmtINR(detail.openCycle.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Since {fmtDate(detail.openCycle.since)} · bills {fmtDate(detail.openCycle.dueDate)}
                  </p>
                  {detail.openCycle.credits > 0 && (
                    <p className="text-xs text-success-text mt-1 tnum">
                      {fmtINR(detail.openCycle.spends)} spent − {fmtINR(detail.openCycle.credits)} back
                    </p>
                  )}
                </div>
              </div>

              {/* Where the open cycle is going */}
              {detail.openCycle.categoryBreakdown.length > 0 && (
                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Recent spends by category
                  </p>
                  <div className="mt-4 space-y-3">
                    {detail.openCycle.categoryBreakdown.map((c) => (
                      <div key={c.category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate">{c.category}</span>
                          <span className="tnum text-muted-foreground shrink-0 ml-3">
                            {fmtINR(c.amount)} · {c.percent}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${c.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <CycleGroup
                  title={`Recent spends · since ${fmtDate(detail.openCycle.since)}`}
                  amount={detail.openCycle.amount}
                  spends={detail.openCycle.spends}
                  credits={detail.openCycle.credits}
                  transactions={detail.openCycle.transactions}
                />
                {detail.statements.length === 0 && detail.openCycle.transactions.length === 0 && (
                  <EmptyState
                    className="rounded-2xl border border-dashed"
                    icon={CreditCardIcon}
                    title="No transactions yet"
                    description="Nothing has been recorded on this card yet."
                  />
                )}
                {detail.statements.map((s) => (
                  <CycleGroup
                    key={s.dueDate}
                    title={`Statement due ${fmtDate(s.dueDate)}`}
                    amount={s.amount}
                    spends={s.spends}
                    credits={s.credits}
                    transactions={s.transactions}
                    badge={{ label: s.status, variant: s.status === "Paid" ? "secondary" : "outline" }}
                  />
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Looking for an older statement? Use{" "}
                <button
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    setSelectedCardId(null)
                    setTab("history")
                  }}
                >
                  Statement History
                </button>
                .
              </p>
            </>
          )}
        </div>
      </AppShell>
    )
  }

  // ── Overview ──────────────────────────────────────────────────────────────
  return (
    <AppShell title="Credit Cards" description="What you owe and what's building up, across every card">
      <div className="space-y-6">
        <div className="inline-flex rounded-lg border p-1 bg-muted/40">
          <button
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              tab === "cards" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("cards")}
          >
            Cards
          </button>
          <button
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              tab === "history"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("history")}
          >
            Statement History
          </button>
        </div>

        {tab === "history" ? (
          overviewLoading ? (
            <SkeletonText lines={3} />
          ) : (
            <CreditCardCycleBrowser cards={cardOptions} />
          )
        ) : (
          <>
            {overviewLoading && <SkeletonRows rows={4} />}

            {!overviewLoading && overview && (
              <>
                {/* Aggregate strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border bg-card p-5 shadow-sm sm:col-span-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Due</p>
                    <p className="text-2xl font-bold tnum mt-1">{fmtINR(overview.totals.totalDue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      across {overview.totals.cardsWithDue} card
                      {overview.totals.cardsWithDue !== 1 ? "s" : ""}
                    </p>
                    {overview.totals.cardsWithDue > 0 && (
                      <Button size="sm" className="mt-3" onClick={() => setPayAllOpen(true)}>
                        Pay all cards together
                      </Button>
                    )}
                  </div>

                  <div className="rounded-2xl border bg-card p-5 shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Recent Spends</p>
                    <p className="text-2xl font-bold tnum mt-1">{fmtINR(overview.totals.totalRecentSpend)}</p>
                    <p className="text-xs text-muted-foreground mt-1">not yet billed, all cards</p>
                    {overview.totals.totalCreditBalance > 0 && (
                      <p className="text-xs text-success-text mt-1">
                        {fmtINR(overview.totals.totalCreditBalance)} credit waiting to be used
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border bg-card p-5 shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Credit Used</p>
                    <p className="text-2xl font-bold tnum mt-1">
                      {overview.totals.overallUtilization != null ? `${overview.totals.overallUtilization}%` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fmtINR(overview.totals.totalOutstanding)} of {fmtINR(overview.totals.totalLimit)}
                    </p>
                    {overview.totals.totalLimit > 0 && (
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            utilizationTone(overview.totals.overallUtilization),
                          )}
                          style={{ width: `${Math.min(100, overview.totals.overallUtilization ?? 0)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card grid */}
                {overview.cards.length === 0 ? (
                  <EmptyState
                    className="rounded-2xl border border-dashed"
                    icon={CreditCardIcon}
                    title="No credit cards yet"
                    description="Add a card in Configurations to start tracking billing cycles."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {overview.cards.map((c) => (
                      <CardTile
                        key={c.id}
                        card={c}
                        paying={payingCardId === c.id}
                        onOpen={() => setSelectedCardId(c.id)}
                        onPay={() => c.due && handlePayCard(c.id, c.due.paymentId)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <AlertDialog open={payAllOpen} onOpenChange={setPayAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pay all cards together?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks {overview?.totals.cardsWithDue || 0} card
              {(overview?.totals.cardsWithDue || 0) !== 1 ? "s" : ""} — {fmtINR(overview?.totals.totalDue || 0)}{" "}
              total — as paid today ({fmtDate(todayISO())}). You can revert any single card's payment afterwards
              from its detail view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paying}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePayAll} disabled={paying}>
              {paying && <InlineSpinner className="mr-2" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
