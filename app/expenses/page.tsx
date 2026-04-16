"use client"

import { useState, useEffect } from "react"
import { format, parseISO, isSameMonth } from "date-fns"
import { ArrowUp, ArrowDownUp, Eye } from "lucide-react"
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

export default function ExpensesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [creditCardSummaries, setCreditCardSummaries] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date(2025, 2, 1)) // March 2025
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [sortByDate, setSortByDate] = useState<"asc" | "desc" | null>(null)
  const [sortByDueDate, setSortByDueDate] = useState<"asc" | "desc" | null>(null)
  const [viewingCreditCardSummary, setViewingCreditCardSummary] = useState<any | null>(null)
  const router = useRouter()

  // Add credit card and petty cash summary records to the expenses tab
  // First, add a useEffect to load petty cash transactions
  const [pettyCashTransactions, setPettyCashTransactions] = useState<Transaction[]>([])

  // Load petty cash transactions
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("transactions")
      if (saved) {
        const allTransactions = JSON.parse(saved)
        // Filter petty cash transactions
        setPettyCashTransactions(allTransactions.filter((t: Transaction) => t.type === "petty-cash"))
      }
    }
  }, [])

  // Load transactions from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("transactions")
      if (saved) {
        const allTransactions = JSON.parse(saved)
        // Filter expense and credit transactions
        setTransactions(allTransactions.filter((t: Transaction) => t.type === "expense" || t.type === "credit"))

        // Generate credit card summaries
        generateCreditCardSummaries(allTransactions)
      }
    }
  }, [])

  // Save transactions to localStorage when they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("transactions")
      if (saved) {
        const allTransactions = JSON.parse(saved)
        // Replace expense and credit transactions
        const otherTransactions = allTransactions.filter(
          (t: Transaction) => t.type !== "expense" && t.type !== "credit",
        )
        localStorage.setItem("transactions", JSON.stringify([...otherTransactions, ...transactions]))
      }
    }
  }, [transactions])

  const generateCreditCardSummaries = (allTransactions: Transaction[]) => {
    const creditTransactions = allTransactions.filter((t: Transaction) => t.type === "credit")

    // Group by card name
    const cardGroups: Record<string, any> = {}

    creditTransactions.forEach((t: Transaction) => {
      if (t.cardName) {
        if (!cardGroups[t.cardName]) {
          cardGroups[t.cardName] = {
            transactions: [],
            totalAmount: 0,
            latestDate: t.date,
            categories: {}, // Track categories for each card
          }
        }

        cardGroups[t.cardName].transactions.push(t)
        cardGroups[t.cardName].totalAmount += t.amount

        // Track categories
        if (!cardGroups[t.cardName].categories[t.category]) {
          cardGroups[t.cardName].categories[t.category] = 0
        }
        cardGroups[t.cardName].categories[t.category] += t.amount

        // Update latest date
        if (new Date(t.date) > new Date(cardGroups[t.cardName].latestDate)) {
          cardGroups[t.cardName].latestDate = t.date
        }
      }
    })

    // Convert to array of summaries
    const summaries = Object.entries(cardGroups).map(([cardName, data]) => {
      // Find the most used category
      let topCategory = "Utilities" // Default
      let maxAmount = 0

      Object.entries(data.categories).forEach(([category, amount]: [string, any]) => {
        if (amount > maxAmount) {
          maxAmount = amount
          topCategory = category
        }
      })

      return {
        id: `card-summary-${cardName}`,
        description: cardName,
        amount: data.totalAmount,
        type: "credit-summary" as any,
        category: topCategory,
        date: data.latestDate,
        dueDate: data.latestDate,
        status: data.transactions.some((t: Transaction) => t.status === "Pending") ? "Pending" : "Paid",
        cardName,
        transactions: data.transactions,
      }
    })

    setCreditCardSummaries(summaries)
  }

  const handleMonthSelect = (month: Date) => {
    setSelectedMonth(month)
  }

  const handleViewTransaction = (transaction: Transaction) => {
    setViewingTransaction(transaction)
  }

  const handleViewCreditCardSummary = (summary: any) => {
    setViewingCreditCardSummary(summary)
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

  const toggleDateSort = () => {
    // Clear due date sort when date sort is activated
    setSortByDueDate(null)

    if (sortByDate === null) {
      setSortByDate("asc")
    } else if (sortByDate === "asc") {
      setSortByDate("desc")
    } else {
      setSortByDate(null)
    }
  }

  const toggleDueDateSort = () => {
    // Clear date sort when due date sort is activated
    setSortByDate(null)

    if (sortByDueDate === null) {
      setSortByDueDate("asc")
    } else if (sortByDueDate === "asc") {
      setSortByDueDate("desc")
    } else {
      setSortByDueDate(null)
    }
  }

  // Filter transactions by selected month
  const filteredTransactions = [...transactions].filter((t) => {
    return selectedMonth.getTime() === new Date(0).getTime()
      ? true // "All" months selected
      : isSameMonth(parseISO(t.date), selectedMonth)
  })

  // Filter credit card summaries by selected month
  const filteredCreditCardSummaries = creditCardSummaries
    .filter((summary) => {
      return selectedMonth.getTime() === new Date(0).getTime()
        ? true // "All" months selected
        : summary.transactions.some((t: Transaction) => isSameMonth(parseISO(t.date), selectedMonth))
    })
    .map((summary) => {
      if (selectedMonth.getTime() === new Date(0).getTime()) {
        return summary
      }

      // Filter transactions by month and recalculate total
      const filteredTransactions = summary.transactions.filter((t: Transaction) =>
        isSameMonth(parseISO(t.date), selectedMonth),
      )

      const totalAmount = filteredTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0)

      return {
        ...summary,
        amount: totalAmount,
        transactions: filteredTransactions,
      }
    })
    .filter((summary) => summary.amount > 0)

  // Create summary records for credit cards and petty cash
  const createSummaryRecords = () => {
    const summaries = []

    // Credit card summaries
    const creditCardSummary = {}
    transactions
      .filter((t) => t.type === "credit")
      .forEach((t) => {
        if (t.cardName) {
          if (!creditCardSummary[t.cardName]) {
            creditCardSummary[t.cardName] = 0
          }
          creditCardSummary[t.cardName] += t.amount
        }
      })

    // Add credit card summaries
    Object.entries(creditCardSummary).forEach(([cardName, amount]) => {
      summaries.push({
        id: `summary-credit-${cardName}`,
        description: cardName,
        amount: amount as number,
        type: "summary",
        category: "Utilities",
        date: new Date().toISOString(),
        isSummary: true,
        summaryType: "credit",
      })
    })

    // Add petty cash summary if there are petty cash transactions
    const pettyCashTotal = pettyCashTransactions.reduce((sum, t) => sum + t.amount, 0)
    if (pettyCashTotal > 0) {
      summaries.push({
        id: "summary-petty-cash",
        description: "Petty Cash",
        amount: pettyCashTotal,
        type: "summary",
        category: "Utilities",
        date: new Date().toISOString(),
        isSummary: true,
        summaryType: "petty-cash",
      })
    }

    return summaries
  }

  // Add the summary records to the transactions list
  const summaryRecords = createSummaryRecords()
  const combinedTransactions = [...filteredTransactions, ...filteredCreditCardSummaries, ...summaryRecords]

  // Sort by date or due date with mutual exclusion
  const sortedTransactions = (() => {
    if (sortByDate) {
      return [...combinedTransactions].sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return sortByDate === "asc" ? dateA - dateB : dateB - dateA
      })
    } else if (sortByDueDate) {
      return [...combinedTransactions].sort((a, b) => {
        const dateA = new Date(a.dueDate || a.date).getTime()
        const dateB = new Date(b.dueDate || b.date).getTime()
        return sortByDueDate === "asc" ? dateA - dateB : dateB - dateA
      })
    }
    return combinedTransactions
  })()

  // Get icon for category
  const getCategoryIcon = (transaction: Transaction | any) => {
    if (transaction.type === "credit-summary") {
      return LucideIcons.CreditCard
    }

    const categoryInfo = expenseCategories.find((c) => c.name === transaction.category)
    const iconName = categoryInfo?.icon || "circle"

    // @ts-ignore - Dynamic icon import
    const Icon = LucideIcons[iconName.charAt(0).toUpperCase() + iconName.slice(1)]
    return Icon || LucideIcons.Circle
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <MonthCalendar onMonthSelect={handleMonthSelect} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Transactions</CardTitle>
          <CardDescription>
            Total Expenses:{" "}
            <span className="font-bold">
              ₹
              {sortedTransactions
                .reduce((sum, t) => sum + t.amount, 0)
                .toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </CardDescription>
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
                      <Button variant="ghost" size="icon" className="ml-1 h-5 w-5" onClick={toggleDateSort}>
                        <ArrowDownUp className="h-3 w-3" />
                      </Button>
                      {sortByDate && <span className="ml-1 text-xs">{sortByDate === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <span>Due Date</span>
                      <Button variant="ghost" size="icon" className="ml-1 h-5 w-5" onClick={toggleDueDateSort}>
                        <ArrowDownUp className="h-3 w-3" />
                      </Button>
                      {sortByDueDate && <span className="ml-1 text-xs">{sortByDueDate === "asc" ? "↑" : "↓"}</span>}
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
                  const isCreditSummary = transaction.type === "credit-summary"
                  const isGeneralSummary = transaction.isSummary

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                          {transaction.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isCreditSummary || isGeneralSummary ? "outline" : "default"}>
                          {transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {transaction.date ? format(parseISO(transaction.date), "dd-MM-yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {transaction.dueDate ? format(parseISO(transaction.dueDate), "dd-MM-yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {!isGeneralSummary && <StatusBadge status={transaction.status || "Pending"} />}
                      </TableCell>
                      <TableCell className="flex items-center">
                        <ArrowUp className="h-4 w-4 mr-1 text-red-600" />
                        <span className="text-red-600">₹{transaction.amount.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {isCreditSummary ? (
                          <TransactionActions
                            transaction={transaction}
                            onView={() => handleViewCreditCardSummary(transaction)}
                            onEdit={() => {}}
                            onDelete={() => {}}
                            isCreditCardSummary={true}
                          />
                        ) : isGeneralSummary ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center"
                            onClick={() => {
                              if (transaction.summaryType === "credit") {
                                // Navigate to credit card page
                                router.push(`/credit-cards?card=${transaction.description}`)
                              } else if (transaction.summaryType === "petty-cash") {
                                // Navigate to petty cash page
                                router.push("/petty-cash")
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        ) : (
                          <TransactionActions
                            transaction={transaction}
                            onView={handleViewTransaction}
                            onEdit={handleEditTransaction}
                            onDelete={handleDeleteTransaction}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <p className="text-center text-muted-foreground">No expense transactions found for the selected month.</p>
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

      {/* Credit Card Summary View Dialog */}
      {viewingCreditCardSummary && (
        <Dialog open={!!viewingCreditCardSummary} onOpenChange={(open) => !open && setViewingCreditCardSummary(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{viewingCreditCardSummary.description} Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <p className="text-sm font-medium">Card Name:</p>
                <p className="col-span-2">{viewingCreditCardSummary.description}</p>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <p className="text-sm font-medium">Total Amount:</p>
                <p className="col-span-2 text-red-600">₹{viewingCreditCardSummary.amount.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <p className="text-sm font-medium">Status:</p>
                <div className="col-span-2">
                  <StatusBadge status={viewingCreditCardSummary.status || "Pending"} />
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <p className="text-sm font-medium">Latest Transaction:</p>
                <p className="col-span-2">{format(parseISO(viewingCreditCardSummary.date), "dd-MM-yyyy")}</p>
              </div>
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Transactions ({viewingCreditCardSummary.transactions.length}):</p>
                <div className="max-h-40 overflow-y-auto">
                  {viewingCreditCardSummary.transactions.map((t: Transaction) => (
                    <div key={t.id} className="flex justify-between items-center py-1 border-b">
                      <span>{t.description}</span>
                      <span className="text-red-600">₹{t.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingCreditCardSummary(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
