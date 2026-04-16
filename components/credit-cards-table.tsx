"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

import { DropdownMenuContent } from "@/components/ui/dropdown-menu"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { DropdownMenu } from "@/components/ui/dropdown-menu"

import { useState } from "react"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import DeleteCreditCardDialog from "@/components/delete-credit-card-dialog"

type CreditCard = {
  id: string
  cardName: string
  cardNumber: string
  cardLimit: number
  billingCycleDate: number
  paymentDueDays: number
  createdAt: string
}

type CreditCardsTableProps = {
  creditCards: CreditCard[]
  onEdit: (card: any) => void
  onDelete: (cardId: number) => void
}

export default function CreditCardsTable({ creditCards, onEdit, onDelete }: CreditCardsTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; cardId: string; cardName: string }>({
    open: false,
    cardId: "",
    cardName: "",
  })

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "₹0"
    return `₹${amount.toLocaleString("en-IN")}`
  }

  const handleDeleteClick = (cardId: string, cardName: string) => {
    setDeleteDialog({ open: true, cardId, cardName })
  }

  const handleConfirmDelete = async () => {
    await onDelete(Number.parseInt(deleteDialog.cardId))
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Card Name</TableHead>
            <TableHead>Card Number</TableHead>
            <TableHead>Card Limit</TableHead>
            <TableHead>Billing Date</TableHead>
            <TableHead>Due Days</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {creditCards.map((card) => {
            const last4Digits = card.cardNumber.slice(-4)

            return (
              <TableRow key={card.id}>
                <TableCell className="font-medium">{card.cardName}</TableCell>
                <TableCell className="font-mono text-sm">{`****${last4Digits}`}</TableCell>
                <TableCell className="font-medium">{formatCurrency(card.cardLimit)}</TableCell>
                <TableCell>{card.billingCycleDate}th</TableCell>
                <TableCell>{card.paymentDueDays} days</TableCell>
                <TableCell>12/30</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(card)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(card.id, card.cardName)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <DeleteCreditCardDialog
        open={deleteDialog.open}
        cardName={deleteDialog.cardName}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
