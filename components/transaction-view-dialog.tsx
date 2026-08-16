"use client"

import { format, parseISO } from "date-fns"
import { Calendar, CreditCard, DollarSign, FileText, Tag, Clock, Info, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import StatusBadge from "@/components/status-badge"
import type { Transaction } from "./dashboard"
import CreditCardPaymentDialog from "./credit-card-payment-dialog"
import { isSyntheticId, SYNTHETIC_ROW_MESSAGE } from "@/lib/tx-id"
import { useState, useEffect } from "react"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"

interface BillSplitParticipant {
  id: number
  person_name: string
  amount: string | number
  personal_loan_id: number | null
}

interface BillSplitDetail {
  total_amount: string | number
  my_share: string | number
  participants: BillSplitParticipant[]
}

function BillSplitSection({ transactionId }: { transactionId: string }) {
  const [detail, setDetail] = useState<BillSplitDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiClient(apiUrl(`/bill-splits/${transactionId}`))
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.status === "success") setDetail(json.data)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [transactionId])

  if (loading) return <p className="text-sm text-muted-foreground">Loading split details…</p>
  if (!detail) return null

  const fmt = (n: string | number) => `₹${Math.round(Number(n)).toLocaleString("en-IN")}`

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="font-medium">Split with others</div>
      </div>
      <div className="rounded-lg border divide-y">
        <div className="flex items-center justify-between px-3 py-2 text-sm">
          <span>Your share</span>
          <span className="font-semibold tnum">{fmt(detail.my_share)}</span>
        </div>
        {detail.participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-muted-foreground">{p.person_name}</span>
            <span className="font-semibold tnum">{fmt(p.amount)}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Each person's share is tracked as a receivable in the Borrowings &amp; Lending tab.
      </p>
    </div>
  )
}

type TransactionViewDialogProps = {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMakePayment: (transaction: Transaction) => void
  onRevokePayment: (transaction: Transaction) => void
  onPaymentComplete?: () => void
}

export default function TransactionViewDialog({
  transaction,
  open,
  onOpenChange,
  onMakePayment,
  onRevokePayment,
  onPaymentComplete,
}: TransactionViewDialogProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  if (!transaction) return null

  // Projected EMI row from a loan schedule — not a real transaction record
  const isProjected = isSyntheticId(transaction.id)
  const isCreditCard = transaction.category === "Credit Card"
  const isIncome = transaction.type === "income"

  // If it's a credit card transaction, show the payment dialog instead
  if (isCreditCard && showPaymentDialog) {
    return (
      <CreditCardPaymentDialog
        transaction={transaction}
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowPaymentDialog(false)
            onOpenChange(false)
          }
        }}
        onPaymentComplete={() => {
          setShowPaymentDialog(false)
          onOpenChange(false)
          onPaymentComplete?.()
        }}
      />
    )
  }

  // If dialog is opening and it's a credit card, show payment dialog
  if (isCreditCard && open && !showPaymentDialog) {
    return (
      <CreditCardPaymentDialog
        transaction={transaction}
        open={open}
        onOpenChange={onOpenChange}
        onPaymentComplete={() => {
          onOpenChange(false)
          onPaymentComplete?.()
        }}
      />
    )
  }

  const isPending = transaction.status === "Pending"
  const isPaid = transaction.status === "Paid"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transaction Details
          </DialogTitle>
          <DialogDescription>View and manage transaction information</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Amount */}
          <div className="text-center">
            <div className={`text-3xl font-bold tnum ${isIncome ? "text-success-text" : "text-destructive-text"}`}>
              {isIncome ? "+" : "-"}₹{transaction.amount.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">{isIncome ? "Income" : "Expense"} Transaction</div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Description</div>
                <div className="text-sm text-muted-foreground">{transaction.description}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Category</div>
                <Badge variant="outline">{transaction.category}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Transaction Date</div>
                <div className="text-sm text-muted-foreground">
                  {format(parseISO(transaction.date), "MMMM dd, yyyy")}
                </div>
              </div>
            </div>

            {transaction.dueDate && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Due Date</div>
                  <div className="text-sm text-muted-foreground">
                    {format(parseISO(transaction.dueDate), "MMMM dd, yyyy")}
                  </div>
                </div>
              </div>
            )}

            {transaction.cardName && (
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Credit Card</div>
                  <div className="text-sm text-muted-foreground">{transaction.cardName}</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Payment Status</div>
                <StatusBadge status={transaction.status || "Pending"} />
              </div>
            </div>
          </div>

          {transaction.splitOwnShare != null && (
            <>
              <Separator />
              <BillSplitSection transactionId={transaction.id} />
            </>
          )}

          <Separator />

          {/* Projected EMI rows have no transactions-table record, so status
              cannot be changed here. Explain rather than offering a button that
              can only fail. */}
          {isProjected && (
            <div className="flex items-start gap-2.5 rounded-lg border border-info/25 bg-info-subtle px-3 py-2.5">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-info-subtle-foreground"
                aria-hidden="true"
              />
              <p className="text-xs text-info-subtle-foreground">
                {SYNTHETIC_ROW_MESSAGE}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isProjected && isPending && (
              <Button onClick={() => onMakePayment(transaction)} className="flex-1">
                Mark as Paid
              </Button>
            )}

            {!isProjected && isPaid && (
              <Button variant="outline" onClick={() => onRevokePayment(transaction)} className="flex-1">
                Mark as Pending
              </Button>
            )}

            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
