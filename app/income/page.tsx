"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, TrendingUp, DollarSign, Calendar } from "lucide-react"
import TransactionList from "@/components/transaction-list"
import TransactionForm from "@/components/transaction-form"
import TransactionViewDialog from "@/components/transaction-view-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Transaction } from "@/components/dashboard"

// Sample income data
const sampleIncomeTransactions: Transaction[] = [
  {
    id: "1",
    description: "Monthly Salary",
    amount: 75000,
    type: "income",
    category: "Salary",
    date: "2025-01-01",
    status: "Paid",
  },
  {
    id: "2",
    description: "Freelance Project",
    amount: 15000,
    type: "income",
    category: "Freelancing",
    date: "2025-01-15",
    status: "Paid",
  },
  {
    id: "3",
    description: "Investment Returns",
    amount: 5000,
    type: "income",
    category: "Interest",
    date: "2025-01-20",
    status: "Paid",
  },
]

export default function IncomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>(sampleIncomeTransactions)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showTransactionForm, setShowTransactionForm] = useState(false)

  // Calculate totals
  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const currentMonthIncome = transactions
    .filter((t) => {
      const transactionDate = new Date(t.date)
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setShowTransactionForm(true)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setShowTransactionForm(true)
  }

  const handleViewTransaction = (transaction: Transaction) => {
    setViewingTransaction(transaction)
  }

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    }
  }

  const handleTransactionSubmit = (transactionData: any) => {
    if (editingTransaction) {
      // Update existing transaction
      setTransactions((prev) =>
        prev.map((t) => (t.id === editingTransaction.id ? { ...t, ...transactionData, type: "income" as const } : t)),
      )
    } else {
      // Add new transaction
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        ...transactionData,
        type: "income",
      }
      setTransactions((prev) => [newTransaction, ...prev])
    }
    setShowTransactionForm(false)
    setEditingTransaction(null)
  }

  const handleMakePayment = (transaction: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === transaction.id ? { ...t, status: "Paid" as const } : t)))
    setViewingTransaction(null)
  }

  const handleRevokePayment = (transaction: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === transaction.id ? { ...t, status: "Pending" as const } : t)))
    setViewingTransaction(null)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Income</h1>
          <p className="text-muted-foreground">Track and manage your income sources</p>
        </div>
        <Button onClick={handleAddTransaction}>
          <Plus className="h-4 w-4 mr-2" />
          Add Income
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{currentMonthIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current month income</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Monthly</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{Math.round(totalIncome / 12).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Estimated average</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      <TransactionList
        transactions={transactions}
        onDelete={handleDeleteTransaction}
        onEdit={handleEditTransaction}
        onView={handleViewTransaction}
        onMakePayment={handleMakePayment}
        onRevokePayment={handleRevokePayment}
        onCategoryFilter={setSelectedCategory}
        selectedCategory={selectedCategory}
      />

      {/* Transaction Form Dialog */}
      <Dialog open={showTransactionForm} onOpenChange={setShowTransactionForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? "Edit Income" : "Add New Income"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            onSubmit={handleTransactionSubmit}
            onCancel={() => setShowTransactionForm(false)}
            editTransaction={editingTransaction}
            transactionType="income"
          />
        </DialogContent>
      </Dialog>

      {/* Transaction View Dialog */}
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
