"use client"

import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { Separator } from "@/components/ui/separator"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import StatusBadge from "@/components/status-badge"
import { FileText, DollarSign, Clock, Loader2 } from "lucide-react"
import type { Transaction } from "./dashboard"

type CreditCardPaymentDialogProps = {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentComplete: () => void
}

export default function CreditCardPaymentDialog({
  transaction,
  open,
  onOpenChange,
  onPaymentComplete,
}: CreditCardPaymentDialogProps) {
  const [paymentDate, setPaymentDate] = useState("")
  const [loading, setLoading] = useState(false)

  if (!transaction) return null

  const isPaid = transaction.status === "Paid"
  const isPending = transaction.status === "Pending"

  const handleMakePayment = async () => {
    if (!paymentDate) {
      alert("Please select a payment date")
      return
    }

    setLoading(true)
    try {
      const paymentId = transaction.payment_id || Number.parseInt(transaction.id)
      console.log("[v0] Making payment with ID:", paymentId)

      const res = await apiClient(
        apiUrl("transaction/payments/update-status"),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: paymentId,
            payment_date: paymentDate,
            status: "Paid",
          }),
        },
      )

      if (!res.ok) throw new Error("Failed to update payment status")

      onPaymentComplete()
      onOpenChange(false)
      setPaymentDate("")
    } catch (e) {
      alert("Failed to process payment. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRevertPayment = async () => {
    setLoading(true)
    try {
      const paymentId = transaction.payment_id || Number.parseInt(transaction.id)
      console.log("[v0] Reverting payment with ID:", paymentId)

      const res = await apiClient(
        apiUrl("transaction/payments/update-status"),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: paymentId,
            payment_date: "",
            status: "Pending",
          }),
        },
      )

      if (!res.ok) throw new Error("Failed to revert payment status")

      onPaymentComplete()
      onOpenChange(false)
    } catch (e) {
      alert("Failed to revert payment. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Credit Card Payment</DialogTitle>
          <DialogDescription>Manage your credit card payment status</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Description</div>
                <div className="text-sm text-muted-foreground">{transaction.description}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Amount</div>
                <div className="text-sm font-semibold text-red-600">₹{transaction.amount.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Due Date</div>
                <div className="text-sm text-muted-foreground">
                  {transaction.dueDate ? format(parseISO(transaction.dueDate), "MMMM dd, yyyy") : "N/A"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={transaction.status || "Pending"} />
            </div>
          </div>

          <Separator />

          {/* Payment Actions Based on Status */}
          {isPending && (
            <div className="space-y-4">
              <div>
                <label className="font-medium text-sm">Payment Date</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleMakePayment} disabled={loading || !paymentDate} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Make Payment
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isPaid && (
            <div className="space-y-4">
              <div className="bg-green-50 p-3 rounded-md">
                <p className="text-sm text-green-800">Payment completed successfully</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleRevertPayment}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Revert Payment
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
