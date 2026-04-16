"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CreditCardFormProps = {
  onSubmit: (data: any) => void
  onCancel: () => void
  editCard?: any
}

export default function CreditCardForm({ onSubmit, onCancel, editCard }: CreditCardFormProps) {
  const [formData, setFormData] = useState({
    cardName: "",
    cardNumber: "",
    cardLimit: "",
    billingCycleDate: "",
    paymentDueDays: "",
  })

  // Populate form when editing
  useEffect(() => {
    if (editCard) {
      setFormData({
        cardName: editCard.card_name || "",
        cardNumber: editCard.card_number || "",
        cardLimit: editCard.card_limit?.toString() || "",
        billingCycleDate: editCard.billing_cycle_date?.toString() || "",
        paymentDueDays: editCard.due_days?.toString() || "",
      })
    }
  }, [editCard])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      ...formData,
      cardLimit: Number.parseFloat(formData.cardLimit),
      billingCycleDate: Number.parseInt(formData.billingCycleDate),
      paymentDueDays: Number.parseInt(formData.paymentDueDays),
    }

    onSubmit(submitData)
  }

  // Generate day options (1-31)
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardName">Card Name</Label>
        <Input
          id="cardName"
          value={formData.cardName}
          onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
          placeholder="e.g., Amazon ICICI"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number (Last 4 digits)</Label>
        <Input
          id="cardNumber"
          value={formData.cardNumber}
          onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
          placeholder="****-****-****-1234"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardLimit">Credit Limit</Label>
        <Input
          id="cardLimit"
          type="number"
          value={formData.cardLimit}
          onChange={(e) => setFormData({ ...formData, cardLimit: e.target.value })}
          placeholder="50000"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="billingCycleDate">Billing Cycle Date</Label>
        <Select
          value={formData.billingCycleDate}
          onValueChange={(value) => setFormData({ ...formData, billingCycleDate: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select day of month" />
          </SelectTrigger>
          <SelectContent>
            {dayOptions.map((day) => (
              <SelectItem key={day} value={day.toString()}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentDueDays">Payment Due Days</Label>
        <Input
          id="paymentDueDays"
          type="number"
          value={formData.paymentDueDays}
          onChange={(e) => setFormData({ ...formData, paymentDueDays: e.target.value })}
          placeholder="20"
          required
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1 bg-black hover:bg-gray-800 text-white">
          {editCard ? "Update" : "Add"} Card
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
          Cancel
        </Button>
      </div>
    </form>
  )
}
