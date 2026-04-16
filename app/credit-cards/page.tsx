"use client"

import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { format, parseISO, isSameMonth } from "date-fns"
import { ArrowUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/status-badge"
import TransactionActions from "@/components/transaction-actions"
import TransactionViewDialog from "@/components/transaction-view-dialog"
import MonthCalendar from "@/components/month-calendar"
import { type Transaction, creditCards } from "@/lib/data"
import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

export default function CreditCardsPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const initialCard = searchParams.get("card")

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedCard, setSelectedCard] = useState<string | null>(initialCard)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date()) // Current month as default
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  // Load transactions from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("transactions")
      if (saved) {
        const allTransactions = JSON.parse(saved)
        // Filter only credit card transactions
        setTransactions(allTransactions.filter((t: Transaction) => t.type === "credit"))
      }
    }
  }, [])

  // Save transactions to localStorage when they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("transactions")
      if (saved) {
        const allTransactions = JSON.parse(saved)
        // Replace credit card transactions
        const nonCreditTransactions = allTransactions.filter((t: Transaction) => t.type !== "credit")
        localStorage.setItem("transactions", JSON.stringify([...nonCreditTransactions, ...transactions]))
      }
    }
  }, [transactions])

  // Get all credit cards that have transactions
  const cardsWithTransactions = [...new Set(transactions.filter((t) => t.cardName).map((t) => t.cardName))] as string[]

  // If no cards have transactions, show all available cards
  const tabCards = cardsWithTransactions.length > 0 ? cardsWithTransactions : creditCards

  // Set initial selected card if none is selected
  useEffect(() => {
    if (!selectedCard && tabCards.length > 0) {
      setSelectedCard(tabCards[0])
    }
  }, [selectedCard, tabCards])

  const handleMonthSelect = (month: Date) => {
    setSelectedMonth(month)
  }

  const handleViewTransaction = (transaction: Transaction) => {
    setViewingTransaction(transaction)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
  }

  const handleUpdateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(transactions.map((t) => (t.id === updatedTransaction.id ? updatedTransaction : t)))
    setEditingTransaction(null)
  }

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id))
  }

  const handleUpdateTransactionStatus = async (transaction: Transaction, newStatus: "Pending" | "Paid") => {
    try {
      const requestBody = {
        id: Number.parseInt(transaction.id),
        status: newStatus,
      }

      console.log("Updating transaction status:", requestBody)

      const response = await apiClient(apiUrl("transaction/update-status"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Transaction status updated successfully:", result)

        // Update local state
        setTransactions(transactions.map((t) => (t.id === transaction.id ? { ...t, status: newStatus } : t)))

        toast({
          title: "Success",
          description: `Payment ${newStatus === "Paid" ? "made" : "revoked"} successfully!`,
          variant: "default",
        })

        setViewingTransaction(null)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update transaction status")
      }
    } catch (error: any) {
      console.error("Error updating transaction status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update payment status. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Filter transactions by selected card and month
  const getFilteredTransactions = (cardName: string) => {
    return transactions.filter((t) => {
      const isForCard = t.cardName === cardName
      const isInSelectedMonth = isSameMonth(parseISO(t.date), selectedMonth)

      return isForCard && isInSelectedMonth
    })
  }

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    const iconName = "creditCard"

    // @ts-ignore - Dynamic icon import
    const Icon = LucideIcons[iconName.charAt(0).toUpperCase() + iconName.slice(1)]
    return Icon || LucideIcons.Circle
  }

  // Calculate total for all credit card transactions
  const totalCreditSpending = transactions.reduce((sum, t) => sum + t.amount, 0)

  // Calculate total for selected card
  const selectedCardTotal = selectedCard
    ? getFilteredTransactions(selectedCard).reduce((sum, t) => sum + t.amount, 0)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">Credit Cards</h1>
        <MonthCalendar onMonthSelect={handleMonthSelect} />
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Fixed: Credit card tabs display horizontally in a flex row */}
          <div className="flex flex-wrap border-b">
            {cardsWithTransactions.map((card) => (
              <button
                key={card}
                onClick={() => setSelectedCard(card)}
                className={cn(
                  "py-3 px-4 text-center font-medium",
                  selectedCard === card ? "bg-black text-white" : "bg-gray-50 text-gray-600 hover:bg-white",
                )}
              >
                {card}
              </button>
            ))}
          </div>

          {tabCards.map((card) => {
            const cardTransactions = getFilteredTransactions(card)

            return (
              <div key={card} className={selectedCard === card ? "block p-4" : "hidden"}>
                {selectedCard && (
                  <div className="p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">{selectedCard}</h3>
                      <p className="text-sm text-muted-foreground">
                        Total:{" "}
                        <span className="font-bold">
                          ₹
                          {selectedCardTotal.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </p>
                    </div>
                    {cardTransactions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cardTransactions.map((transaction) => {
                            const Icon = getCategoryIcon(transaction.category)

                            return (
                              <TableRow key={transaction.id}>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {transaction.description}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{transaction.category}</Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {format(parseISO(transaction.date), "dd-MM-yyyy")}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {transaction.dueDate ? format(parseISO(transaction.dueDate), "dd-MM-yyyy") : "N/A"}
                                </TableCell>
                                <TableCell className="text-center">
                                  <StatusBadge status={transaction.status || "Pending"} />
                                </TableCell>
                                <TableCell className="flex items-center">
                                  <ArrowUp className="h-4 w-4 mr-1 text-red-600" />
                                  <span className="text-red-600">₹{transaction.amount.toFixed(2)}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <TransactionActions
                                    transaction={transaction}
                                    onView={handleViewTransaction}
                                    onEdit={handleEditTransaction}
                                    onDelete={handleDeleteTransaction}
                                    onRevokePayment={(t) => handleUpdateTransactionStatus(t, "Pending")}
                                  />
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="flex h-32 items-center justify-center">
                        <p className="text-center text-muted-foreground">
                          No transactions found for this credit card in the selected month.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {tabCards.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No credit card transactions yet.</div>
          )}
        </CardContent>
      </Card>

      <TransactionViewDialog
        transaction={viewingTransaction}
        open={!!viewingTransaction}
        onOpenChange={(open) => !open && setViewingTransaction(null)}
        onMakePayment={(t) => handleUpdateTransactionStatus(t, "Paid")}
        onRevokePayment={(t) => handleUpdateTransactionStatus(t, "Pending")}
      />
    </div>
  )
}
