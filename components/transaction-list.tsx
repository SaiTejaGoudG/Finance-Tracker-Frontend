"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/states"
import StatusBadge from "@/components/status-badge"
import { Eye, Edit, Calendar, CreditCard, Wallet, TrendingUp, ArrowUpDown, Receipt } from "lucide-react"
import type { Transaction } from "./dashboard"

type TransactionListProps = {
  transactions: Transaction[]
  onViewTransaction: (transaction: Transaction) => void
  onEditTransaction: (transaction: Transaction) => void
  title?: string
  showAddButton?: boolean
  onAddTransaction?: () => void
}

export default function TransactionList({
  transactions,
  onViewTransaction,
  onEditTransaction,
  title = "Recent Transactions",
  showAddButton = false,
  onAddTransaction,
}: TransactionListProps) {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income":
        return <TrendingUp className="h-4 w-4 text-success-text" />
      case "expense":
        return <ArrowUpDown className="h-4 w-4 text-destructive-text" />
      case "credit":
        return <CreditCard className="h-4 w-4 text-info-text" />
      case "petty-cash":
        return <Wallet className="h-4 w-4 text-warning-text" />
      case "investment":
        return <TrendingUp className="h-4 w-4 text-info-text" />
      default:
        return <Calendar className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getAmountColor = (type: string) => {
    switch (type) {
      case "income":
        return "text-success-text"
      case "investment":
        return "text-info-text"
      default:
        return "text-destructive-text"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{title}</CardTitle>
          {showAddButton && onAddTransaction && (
            <Button
              onClick={onAddTransaction}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Add Transaction
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            compact
            title="No transactions found"
            description="Transactions will appear here once they've been added."
            action={
              showAddButton && onAddTransaction ? (
                <Button onClick={onAddTransaction} size="sm" variant="outline">
                  Add Transaction
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {transaction.category} • {new Date(transaction.date).toLocaleDateString()}
                      {transaction.cardName && ` • ${transaction.cardName}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`font-semibold tnum ${getAmountColor(transaction.type)}`}>
                      ₹{transaction.amount.toLocaleString()}
                    </div>
                    {transaction.status && <StatusBadge status={transaction.status} />}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onViewTransaction(transaction)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log("🔧 Edit button clicked in TransactionList for:", transaction)
                        onEditTransaction(transaction)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
