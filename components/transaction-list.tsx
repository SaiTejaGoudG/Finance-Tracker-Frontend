"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Edit, Calendar, CreditCard, Wallet, TrendingUp, ArrowUpDown } from "lucide-react"
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
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "expense":
        return <ArrowUpDown className="h-4 w-4 text-red-600" />
      case "credit":
        return <CreditCard className="h-4 w-4 text-blue-600" />
      case "petty-cash":
        return <Wallet className="h-4 w-4 text-orange-600" />
      case "investment":
        return <TrendingUp className="h-4 w-4 text-purple-600" />
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />
    }
  }

  const getAmountColor = (type: string) => {
    switch (type) {
      case "income":
        return "text-green-600"
      case "investment":
        return "text-blue-600"
      default:
        return "text-red-600"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{title}</CardTitle>
          {showAddButton && onAddTransaction && (
            <Button onClick={onAddTransaction} size="sm" className="bg-black hover:bg-gray-800 text-white">
              Add Transaction
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No transactions found.</div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-sm text-gray-600">
                      {transaction.category} • {new Date(transaction.date).toLocaleDateString()}
                      {transaction.cardName && ` • ${transaction.cardName}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`font-semibold ${getAmountColor(transaction.type)}`}>
                      ₹{transaction.amount.toLocaleString()}
                    </div>
                    {transaction.status && (
                      <Badge variant={transaction.status === "Paid" ? "default" : "secondary"} className="text-xs">
                        {transaction.status}
                      </Badge>
                    )}
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
