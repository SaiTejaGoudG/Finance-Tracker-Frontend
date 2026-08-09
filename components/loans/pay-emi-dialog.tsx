"use client"

/**
 * Record a scheduled EMI as paid.
 *
 * POST /loans/:id/pay-emi was implemented on the backend but never wired up in
 * the UI, so the only payment action available was "Part Payment" (an extra
 * lump sum against principal). Users trying to record an ordinary monthly EMI
 * had nowhere to do it.
 *
 * The endpoint does four things server-side, so nothing needs replicating here:
 *   - marks the loan_emi_schedule row paid
 *   - creates the matching Expense transaction (category "EMI")
 *   - writes a loan_payments audit row
 *   - recalculates outstanding principal, totals paid and remaining EMIs
 * It also busts the dashboard cache for the payment month.
 */

import { useState } from "react"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useToast } from "@/components/ui/use-toast"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"

export interface PayEmiTarget {
  /** loan_emi_schedule.id */
  scheduleId: number
  emiNo: number
  dueDate: string
  emiAmount: number
  principal: number
  interest: number
}

const PAYMENT_MODES = [
  { value: "manual", label: "Manual" },
  { value: "auto_debit", label: "Auto debit" },
  { value: "upi", label: "UPI" },
  { value: "net_banking", label: "Net banking" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
]

const fmtINR = (n: number) => `₹${n.toLocaleString("en-IN")}`

interface PayEmiDialogProps {
  loanId: string
  target: PayEmiTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful payment so the caller can refetch. */
  onPaid: () => void
}

export default function PayEmiDialog({
  loanId,
  target,
  open,
  onOpenChange,
  onPaid,
}: PayEmiDialogProps) {
  const { toast } = useToast()
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [amount, setAmount] = useState("")
  const [mode, setMode] = useState("manual")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  if (!target) return null

  // Amount defaults to the scheduled EMI; overrideable for partial/rounded pays
  const amountValue = amount.trim() === "" ? target.emiAmount : Number(amount)
  const amountInvalid = !Number.isFinite(amountValue) || amountValue <= 0

  const reset = () => {
    setPaymentDate(format(new Date(), "yyyy-MM-dd"))
    setAmount("")
    setMode("manual")
    setNotes("")
  }

  const handleSubmit = async () => {
    if (!paymentDate) {
      toast({
        title: "Payment date required",
        description: "Pick the date this EMI was actually paid.",
        variant: "destructive",
      })
      return
    }
    if (amountInvalid) {
      toast({
        title: "Enter a valid amount",
        description: "The amount paid must be greater than zero.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const res = await apiClient(apiUrl(`/loans/${loanId}/pay-emi`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emi_schedule_id: target.scheduleId,
          payment_date: paymentDate,
          amount_paid: amountValue,
          payment_mode: mode,
          notes: notes.trim() || null,
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || json?.status === "error") {
        throw new Error(json?.message || "Failed to record the payment")
      }

      toast({
        title: `EMI #${target.emiNo} marked as paid`,
        description: "An EMI expense has been recorded and the loan balance updated.",
      })

      reset()
      onOpenChange(false)
      onPaid()
    } catch (err) {
      toast({
        title: "Couldn't record the payment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) {
          if (!next) reset()
          onOpenChange(next)
        }
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Record EMI #{target.emiNo}</DialogTitle>
          <DialogDescription>
            Due {format(new Date(target.dueDate), "d MMM yyyy")} ·{" "}
            {fmtINR(target.principal)} principal + {fmtINR(target.interest)} interest
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted px-4 py-3">
            <p className="text-xs text-muted-foreground">Scheduled EMI</p>
            <p className="tnum text-xl font-semibold text-foreground">
              {fmtINR(target.emiAmount)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emi-paid-date" className="text-xs font-medium">
                Payment date
              </Label>
              <Input
                id="emi-paid-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emi-paid-amount" className="text-xs font-medium">
                Amount paid
              </Label>
              <Input
                id="emi-paid-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder={String(target.emiAmount)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={saving}
                className="tnum"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Payment mode</Label>
            <SearchableSelect
              value={mode}
              onValueChange={setMode}
              disabled={saving}
              placeholder="Select mode"
              searchPlaceholder="Search mode…"
              options={PAYMENT_MODES}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emi-paid-notes" className="text-xs font-medium">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="emi-paid-notes"
              placeholder="Reference number, remarks…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            This also records an EMI expense for {fmtINR(amountInvalid ? target.emiAmount : amountValue)} and
            reduces the loan's outstanding balance.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || amountInvalid}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "Recording…" : "Mark as paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
