"use client"

/**
 * Petty Cash — small day-to-day cash spends.
 *
 * This page used to keep its own ledger in `localStorage["transactions"]`,
 * entirely separate from the server. That was broken in two directions:
 * nothing in the app ever wrote that key (the save effect was guarded by
 * `if (saved)`, so it only ever ran when the key already existed — which it
 * never did), so the table was permanently empty; and had it worked, the
 * rows would still have been invisible to every analytics screen, because
 * `Petty Cash` is a real server-side transaction_type that the dashboard,
 * overview and extended-analytics services all aggregate over.
 *
 * It now reads the same `transaction/listing` endpoint as every other view,
 * filtered to `transaction_type=Petty Cash`, so what you see here is what
 * the rest of the app is counting.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { format, parseISO } from "date-fns"
import { Coins, Plus, Receipt, TrendingDown } from "lucide-react"
import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StatTile } from "@/components/ui/stat-tile"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import LayoutWrapper from "@/components/layout-wrapper"
import MonthCalendar from "@/components/month-calendar"
import TransactionForm from "@/components/transaction-form"
import TransactionsTable from "@/components/transactions/transactions-table"
import TransactionViewDialog from "@/components/transaction-view-dialog"
import { toTransactionId, SYNTHETIC_ROW_MESSAGE } from "@/lib/tx-id"
import type { Transaction } from "@/lib/transaction-types"
import { toEditTransaction } from "@/lib/transaction-types"

/** Server-side name for this transaction_type. */
const PETTY_CASH = "Petty Cash"

type ApiRow = {
  id: number
  transaction_type: string
  description: string
  category: string
  transaction_date: string // "dd-MM-yyyy"
  due_date: string | null
  status: "Paid" | "Pending"
  amount: number
  owner_type?: string | null
  expense_type?: string | null
  split_own_share?: number | null
  txn_kind?: "purchase" | "refund" | "cashback" | null
  refund_for_id?: number | null
}

/** "05-06-2025" → "2025-06-05" */
const toISO = (d: string) => {
  const [day, month, year] = d.split("-")
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

const toTransaction = (r: ApiRow): Transaction => ({
  id: String(r.id),
  description: r.description,
  amount: r.amount,
  type: "petty-cash",
  category: r.category,
  date: toISO(r.transaction_date),
  dueDate: r.due_date ? toISO(r.due_date) : undefined,
  status: r.status,
  ownerType: r.owner_type ?? "self",
  expenseType: (r.expense_type as "fixed" | "variable" | null) ?? null,
  purpose: null,
  splitOwnShare: r.split_own_share ?? null,
  txnKind: r.txn_kind ?? "purchase",
  refundForId: r.refund_for_id ?? null,
})

const inr = (n: number) =>
  `₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

function PettyCashPageContent() {
  const { toast } = useToast()

  const [rows, setRows] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedMonth, setSelectedMonth] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )

  const [sortBy, setSortBy] = useState<"date" | "amount">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const [viewing, setViewing] = useState<Transaction | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [showForm, setShowForm] = useState(false)

  const isFetchingRef = useRef(false)

  const fetchRows = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        transaction_type: PETTY_CASH,
        month: String(selectedMonth.getMonth() + 1),
        year: String(selectedMonth.getFullYear()),
        // Petty cash is small-ticket by nature; a month's worth comfortably
        // fits one page, so there's no pager here.
        page: "1",
        limit: "500",
        sort_column: "transaction_date",
        sort_order: "desc",
      })

      const res = await apiClient(apiUrl("transaction/listing", params), { method: "GET" })
      const json = await res.json()

      if (!res.ok || json?.status === "error") {
        throw new Error(json?.message || "Failed to load petty cash transactions")
      }

      const list: ApiRow[] = json?.data?.data ?? []
      setRows(list.map(toTransaction))
    } catch (e) {
      console.error("Error loading petty cash:", e)
      setError(e instanceof Error ? e.message : "Failed to load petty cash transactions")
      setRows([])
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [selectedMonth])

  useEffect(() => {
    void fetchRows()
  }, [fetchRows])

  // ─── Derived ────────────────────────────────────────────────────────────────

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const diff =
        sortBy === "amount"
          ? a.amount - b.amount
          : new Date(a.date).getTime() - new Date(b.date).getTime()
      return sortOrder === "asc" ? diff : -diff
    })
    return copy
  }, [rows, sortBy, sortOrder])

  const stats = useMemo(() => {
    // A split petty-cash bill only costs the user their own share, so that's
    // what the total has to use — same rule the backend's effectiveAmount
    // applies. Refunds come back as credits and reduce the total.
    const own = (t: Transaction) =>
      t.txnKind === "refund" ? -t.amount : t.splitOwnShare ?? t.amount

    const total = rows.reduce((s, t) => s + own(t), 0)
    const count = rows.length
    const largest = rows.reduce((max, t) => Math.max(max, own(t)), 0)
    return { total, count, largest }
  }, [rows])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const toggleSort = (column: "date" | "amount") => {
    if (column === sortBy) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  const handleRestore = async (id: string) => {
    try {
      const res = await apiClient(apiUrl(`transaction/${id}/restore`), { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || (json as any)?.status === "error") {
        throw new Error((json as any)?.message || "Restore failed")
      }
      toast({ title: "Restored" })
    } catch (e) {
      toast({
        title: "Couldn't restore",
        description: e instanceof Error ? e.message : "Please re-enter the transaction.",
        variant: "destructive",
      })
    } finally {
      void fetchRows()
    }
  }

  // Same delete-then-restore contract as All Transactions: the delete is real
  // and immediate, and Undo is only offered when the server says the row can
  // actually be brought back (see transactionService.getRestoreBlockers).
  const handleDelete = async (id: string) => {
    setRows((prev) => prev.filter((t) => String(t.id) !== String(id)))

    try {
      const res = await apiClient(apiUrl(`transaction/delete/${id}`), { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as any)?.message || "Delete failed")

      const restorable = Boolean((json as any).restorable)
      toast({
        title: "Transaction deleted",
        description: restorable
          ? undefined
          : (json as any).restoreBlockedReason
            ? `This can't be undone because ${(json as any).restoreBlockedReason}.`
            : "This one can't be undone automatically.",
        action: restorable ? (
          <ToastAction altText="Undo delete" onClick={() => void handleRestore(id)}>
            Undo
          </ToastAction>
        ) : undefined,
      })
    } catch (e) {
      console.error("Error deleting petty cash transaction:", e)
      toast({
        title: "Couldn't delete",
        description: e instanceof Error ? e.message : "Failed to delete transaction.",
        variant: "destructive",
      })
    } finally {
      void fetchRows()
    }
  }

  const setPaymentStatus = async (t: Transaction, status: "Paid" | "Pending") => {
    const txnId = toTransactionId(t.id)
    if (txnId === null) {
      toast({ title: "Can't update this row", description: SYNTHETIC_ROW_MESSAGE, variant: "destructive" })
      return
    }

    try {
      const res = await apiClient(apiUrl("transaction/update-status"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: txnId, status }),
      })
      if (!res.ok) throw new Error("Failed to update payment status")

      toast({ title: "Success", description: `Marked as ${status}.` })
      setViewing(null)
      await fetchRows()
    } catch (e) {
      console.error("Error updating payment status:", e)
      toast({
        title: "Error",
        description: "Failed to update payment status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (t: Transaction) => {
    setEditing(t)
    setShowForm(true)
  }

  const handleFormSubmit = async () => {
    toast({ title: "Success", description: `Transaction ${editing ? "updated" : "created"}.` })
    setShowForm(false)
    setEditing(null)
    await fetchRows()
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditing(null)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Petty Cash</h1>
          <MonthCalendar onMonthSelect={setSelectedMonth} value={selectedMonth} />
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add transaction
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Spent this month"
          value={inr(stats.total)}
          sub={format(selectedMonth, "MMMM yyyy")}
          tone="destructive"
          icon={TrendingDown}
          emphasis
        />
        <StatTile
          label="Transactions"
          value={String(stats.count)}
          sub={stats.count === 1 ? "1 entry" : `${stats.count} entries`}
          icon={Receipt}
        />
        <StatTile
          label="Largest single spend"
          value={stats.largest ? inr(stats.largest) : "—"}
          icon={Coins}
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonRows rows={6} />
          </div>
        ) : error ? (
          <ErrorState description={error} onRetry={() => void fetchRows()} />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="No petty cash this month"
            description={`Nothing recorded for ${format(selectedMonth, "MMMM yyyy")}.`}
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null)
                  setShowForm(true)
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add transaction
              </Button>
            }
          />
        ) : (
          <TransactionsTable
            transactions={sorted}
            density="comfortable"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onToggleSort={toggleSort}
            selectedIds={new Set<string>()}
            onToggleSelect={() => {}}
            onToggleSelectAll={() => {}}
            showDueDate={false}
            showCardColumn={false}
            showCardBadge={false}
            onView={setViewing}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </Card>

      <Dialog open={showForm} onOpenChange={(open) => (open ? setShowForm(true) : handleFormCancel())}>
        <DialogContent className="sm:max-w-[540px] flex flex-col max-h-[90vh] p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>{editing ? "Edit Transaction" : "Add Petty Cash"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-5 py-4">
            <TransactionForm
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              editTransaction={toEditTransaction(editing)}
              defaultType="petty-cash"
            />
          </div>
        </DialogContent>
      </Dialog>

      <TransactionViewDialog
        transaction={viewing}
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        onMakePayment={(t) => void setPaymentStatus(t, "Paid")}
        onRevokePayment={(t) => void setPaymentStatus(t, "Pending")}
      />
    </div>
  )
}

export default function PettyCashPage() {
  return (
    <LayoutWrapper>
      <PettyCashPageContent />
    </LayoutWrapper>
  )
}
