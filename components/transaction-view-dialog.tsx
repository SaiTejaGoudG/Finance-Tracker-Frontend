"use client"

import { format, parseISO } from "date-fns"
import { Calendar, CreditCard, DollarSign, FileText, Tag, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import StatusBadge from "@/components/status-badge"
import type { Transaction } from "./dashboard"
import CreditCardPaymentDialog from "./credit-card-payment-dialog"
import { useState } from "react"

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
            <div className={`text-3xl font-bold ${isIncome ? "text-green-600" : "text-red-600"}`}>
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

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isPending && (
              <Button onClick={() => onMakePayment(transaction)} className="flex-1">
                Mark as Paid
              </Button>
            )}

            {isPaid && (
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
