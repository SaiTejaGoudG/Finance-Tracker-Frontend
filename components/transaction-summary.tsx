"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon } from "lucide-react"

interface TransactionSummaryProps {
  totalIncome: number
  totalExpenses: number
  totalInvestments: number
  balance: number
}

export default function TransactionSummary({
  totalIncome,
  totalExpenses,
  totalInvestments,
  balance,
}: TransactionSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-success-text" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tnum text-success-text">₹{totalIncome.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <ArrowUpIcon className="h-4 w-4 text-destructive-text" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tnum text-destructive-text">₹{totalExpenses.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
          <TrendingUpIcon className="h-4 w-4 text-info-text" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tnum text-info-text">₹{totalInvestments.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Balance</CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold tnum ${balance >= 0 ? "text-success-text" : "text-destructive-text"}`}>
            ₹{Math.abs(balance).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
