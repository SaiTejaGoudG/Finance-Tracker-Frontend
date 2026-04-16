"use client"

import { useState, useEffect } from "react"
import { format, parseISO, isSameMonth } from "date-fns"
import { ArrowUp, ArrowDownUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/status-badge"
import TransactionActions from "@/components/transaction-actions"
import TransactionViewDialog from "@/components/transaction-view-dialog"
import MonthCalendar from "@/components/month-calendar"
import { type Transaction, expenseCategories } from "@/components/dashboard"
import * as LucideIcons from "lucide-react"

export default function PettyCashPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date(2025, 2, 1)) // March 2025
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)

  // Load transactions from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("transactions")
      if (saved) {
        const allTransactions = JSON.parse(saved)
        // Filter petty cash transactions
        setTransactions(allTransactions.filter((t: Transaction) => t.type === "petty-cash"))
      }
    }
  }, [])

  // Save transactions to localStorage when they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("transactions")
      if (saved) {
        const allTransactions = JSON.parse(saved)
        // Replace petty cash transactions
        const otherTransactions = allTransactions.filter((t: Transaction) => t.type !== "petty-cash")
        localStorage.setItem("transactions", JSON.stringify([...otherTransactions, ...transactions]))
      }
    }
  }, [transactions])

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

  const handleMakePayment = (transaction: Transaction) => {
    handleUpdateTransaction({
      ...transaction,
      status: "Paid",
    })
    setViewingTransaction(null)
  }

  const handleRevokePayment = (transaction: Transaction) => {
    handleUpdateTransaction({
      ...transaction,
      status: "Pending",
    })
    setViewingTransaction(null)
  }

  const toggleSortDirection = () => {
    if (sortDirection === null) {
      setSortDirection("asc")
    } else if (sortDirection === "asc") {
      setSortDirection("desc")
    } else {
      setSortDirection(null)
    }
  }

  // Filter transactions by selected month
  const filteredTransactions = [...transactions].filter((t) => {
    return selectedMonth.getTime() === new Date(0).getTime()
      ? true // "All" months selected
      : isSameMonth(parseISO(t.date), selectedMonth)
  })

  // Sort transactions by date if needed
  const sortedTransactions = sortDirection
    ? [...filteredTransactions].sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA
      })
    : filteredTransactions

  // Get icon for category
  const getCategoryIcon = (transaction: Transaction) => {
    const categoryInfo = expenseCategories.find((c) => c.name === transaction.category)
    const iconName = categoryInfo?.icon || "circle"

    // @ts-ignore - Dynamic icon import
    const Icon = LucideIcons[iconName.charAt(0).toUpperCase() + iconName.slice(1)]
    return Icon || LucideIcons.Circle
  }

  // Calculate total petty cash for the month
  const totalPettyCash = sortedTransactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Petty Cash</h1>
          <MonthCalendar onMonthSelect={handleMonthSelect} />
        </div>

        <Button variant="outline" size="sm" onClick={toggleSortDirection} className="flex items-center gap-2">
          Sort by Date
          <ArrowDownUp className="h-4 w-4" />
          <span className="ml-1">{sortDirection === "asc" ? "(Oldest First)" : "(Newest First)"}</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Petty Cash Transactions</CardTitle>
            <CardDescription>
              Total Petty Cash:{" "}
              <span className="font-bold">
                ₹
                {sortedTransactions
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">Total: ₹{totalPettyCash.toFixed(2)}</div>
            <CardDescription>
              {selectedMonth.getTime() === new Date(0).getTime() ? "All time" : format(selectedMonth, "MMMM yyyy")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {sortedTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <span>Date</span>
                      <Button variant="ghost" size="icon" className="ml-1 h-5 w-5" onClick={toggleSortDirection}>
                        <ArrowDownUp className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((transaction) => {
                  const Icon = getCategoryIcon(transaction)

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                          {transaction.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{transaction.category}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(transaction.date), "dd-MM-yyyy")}
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
                No petty cash transactions found for the selected month.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionViewDialog
        transaction={viewingTransaction}
        open={!!viewingTransaction}
        onOpenChange={(open) => !open && setViewingTransaction(null)}
        onMakePayment={handleMakePayment}
        onRevokePayment={handleRevokePayment}
      />
    </div>
  )
}
