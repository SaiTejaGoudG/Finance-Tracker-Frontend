"use client"

/**
 * Browse any past billing cycle, for any card — the deep-dive complement to
 * the trimmed "current + recent" view on a card's detail page. That view
 * intentionally only shows the latest statement and the still-open cycle;
 * this component is where "what did I spend in March" lives instead, via
 * GET /credit-cards/:cardId/billing-cycles (list of due dates) and
 * GET /credit-cards/:cardId/billing-cycles/:dueDate/transactions (one
 * cycle's transactions) — both unchanged since the original dropdown-based
 * Billing Cycles page.
 *
 * Takes the card list as a prop (the parent page already fetched it for the
 * overview) rather than re-fetching configurations/listing itself.
 */

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, SkeletonText } from "@/components/ui/states"
import { CreditCard as CreditCardIcon, Calendar, IndianRupee, Plus } from "lucide-react"
import { format, parseISO } from "date-fns"
import { toast } from "@/hooks/use-toast"
import TransactionForm from "@/components/transaction-form"
import { cn } from "@/lib/utils"

interface CardOption {
  id: number
  cardName: string
}

interface BillingCycleOption {
  dueDate: string
  amount: number
  transactionCount: number
  status: "Paid" | "Pending"
  paymentDate: string | null
}

interface CycleTransaction {
  id: number
  description: string
  category: string
  amount: number
  transactionDate: string
  purpose?: string | null
  status: string
  txnKind?: "purchase" | "refund" | "cashback"
}

interface CycleDetail {
  card: { id: number; cardName: string; billingCycleDate: number; dueDays: number }
  dueDate: string
  total: number
  spends: number
  credits: number
  transactions: CycleTransaction[]
}

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`
const fmtDate = (s: string) => {
  try {
    return format(parseISO(s), "dd MMM yyyy")
  } catch {
    return s
  }
}

export default function CreditCardCycleBrowser({
  cards,
  initialCardId,
}: {
  cards: CardOption[]
  initialCardId?: number
}) {
  const [selectedCardId, setSelectedCardId] = useState<string>(initialCardId ? String(initialCardId) : "")
  const [cycles, setCycles] = useState<BillingCycleOption[]>([])
  const [cyclesLoading, setCyclesLoading] = useState(false)
  const [selectedDueDate, setSelectedDueDate] = useState<string>("")

  const [detail, setDetail] = useState<CycleDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [txnFormOpen, setTxnFormOpen] = useState(false)

  // Just fetches — deliberately does NOT clear the current cycle selection,
  // so it can also be used to refresh totals in place after adding a
  // transaction. Clearing on card change is the effect's job below.
  const fetchCycles = useCallback((cardId: string) => {
    setCyclesLoading(true)
    return apiClient(apiUrl(`credit-cards/${cardId}/billing-cycles`))
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setCycles(json.data || [])
      })
      .catch(() => {})
      .finally(() => setCyclesLoading(false))
  }, [])

  useEffect(() => {
    if (selectedCardId) {
      setSelectedDueDate("")
      setDetail(null)
      fetchCycles(selectedCardId)
    } else {
      setCycles([])
      setSelectedDueDate("")
      setDetail(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardId])

  // Extracted from an inline effect so adding a transaction can re-run it
  // without having to fake a dependency change.
  const fetchDetail = useCallback((cardId: string, dueDate: string) => {
    setDetailLoading(true)
    return apiClient(apiUrl(`credit-cards/${cardId}/billing-cycles/${dueDate}/transactions`))
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setDetail(json.data)
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCardId || !selectedDueDate) return
    fetchDetail(selectedCardId, selectedDueDate)
  }, [selectedCardId, selectedDueDate, fetchDetail])

  // A new card transaction changes the cycle's amount and transaction count,
  // and may land in the cycle currently on screen — so refresh both lists.
  const handleTransactionAdded = async () => {
    setTxnFormOpen(false)
    toast({ title: "Transaction added" })
    if (selectedCardId) {
      await fetchCycles(selectedCardId)
      if (selectedDueDate) await fetchDetail(selectedCardId, selectedDueDate)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Browse a billing cycle</p>
          <p className="text-xs text-muted-foreground">Look up any past statement for any card, not just the latest.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTxnFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add transaction
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">Credit Card</label>
          <SearchableSelect
            value={selectedCardId}
            onValueChange={setSelectedCardId}
            placeholder="Select a card"
            searchPlaceholder="Search cards…"
            options={cards.map((c) => ({
              value: String(c.id),
              label: c.cardName,
              icon: <CreditCardIcon className="h-4 w-4 text-muted-foreground" />,
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">Billing Cycle</label>
          <SearchableSelect
            value={selectedDueDate}
            onValueChange={setSelectedDueDate}
            placeholder={
              !selectedCardId ? "Select a card first" : cyclesLoading ? "Loading cycles…" : "Select a cycle"
            }
            searchPlaceholder="Search due dates…"
            options={cycles.map((c) => ({
              value: c.dueDate,
              label: `Due ${fmtDate(c.dueDate)} — ${fmtINR(c.amount)} · ${c.transactionCount} txn${c.transactionCount !== 1 ? "s" : ""} · ${c.status}`,
              icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
            }))}
          />
        </div>
      </div>

      {selectedCardId && !selectedDueDate && !cyclesLoading && cycles.length === 0 && (
        <EmptyState
          className="rounded-2xl border border-dashed"
          icon={Calendar}
          title="No billing cycles yet"
          description="This card has no recorded transactions, so there's no billing cycle to show."
          compact
        />
      )}

      {detailLoading && <SkeletonText lines={4} />}

      {!detailLoading && detail && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Cycle Total</p>
              <p className="text-xl font-bold tnum mt-2">{fmtINR(detail.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">Due {fmtDate(detail.dueDate)}</p>
              {detail.credits > 0 && (
                <p className="text-xs text-success-text mt-1 tnum">
                  {fmtINR(detail.spends)} spent − {fmtINR(detail.credits)} back
                </p>
              )}
            </div>
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Transactions</p>
              <p className="text-xl font-bold tnum mt-2">{detail.transactions.length}</p>
              <p className="text-xs text-muted-foreground mt-1">In this cycle</p>
            </div>
            <div className="rounded-2xl border bg-card p-4 shadow-sm col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Card</p>
              <p className="text-xl font-bold mt-2 truncate">{detail.card.cardName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bills on {detail.card.billingCycleDate} · Due +{detail.card.dueDays}d
              </p>
            </div>
          </div>

          {detail.transactions.length === 0 ? (
            <EmptyState
              className="rounded-2xl border border-dashed"
              icon={IndianRupee}
              title="No transactions in this cycle"
              description="Nothing was recorded against this card in this billing period."
              compact
            />
          ) : (
            <div className="rounded-2xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.transactions.map((t) => {
                    const credit = t.txnKind === "refund" || t.txnKind === "cashback"
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.description}</TableCell>
                        <TableCell className="text-muted-foreground">{t.category}</TableCell>
                        <TableCell className="text-muted-foreground tnum">{fmtDate(t.transactionDate)}</TableCell>
                        <TableCell>
                          {credit ? (
                            <Badge variant="outline" className="border-success/30 text-xs text-success-text">
                              {t.txnKind === "refund" ? "Refund" : "Cashback"}
                            </Badge>
                          ) : (
                            t.purpose && (
                              <Badge variant="outline" className="text-xs">
                                {t.purpose}
                              </Badge>
                            )
                          )}
                        </TableCell>
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
      )}

      {/* TransactionForm posts to the API itself — this only closes, toasts
          and refreshes the cycle list + open cycle detail. */}
      <Dialog open={txnFormOpen} onOpenChange={setTxnFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm
            onSubmit={handleTransactionAdded}
            onCancel={() => setTxnFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
