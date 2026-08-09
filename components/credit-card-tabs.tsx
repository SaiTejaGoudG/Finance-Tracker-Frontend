"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/states"
import StatusBadge from "@/components/status-badge"
import { CreditCard, Calendar, IndianRupee } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreditCardTransaction {
  id: string
  description: string
  amount: number
  date: string
  category: string
  status: "Paid" | "Pending"
}

interface CreditCardData {
  id: string
  name: string
  lastFourDigits: string
  transactions: CreditCardTransaction[]
  totalAmount: number
}

interface CreditCardTabsProps {
  creditCards: CreditCardData[]
}

export default function CreditCardTabs({ creditCards }: CreditCardTabsProps) {
  const [activeCard, setActiveCard] = useState(creditCards[0]?.id || "")

  const activeCardData = creditCards.find((card) => card.id === activeCard)

  if (!creditCards.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={CreditCard}
            compact
            title="No credit cards found"
            description="Add a credit card to start tracking its statements here."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Credit Cards
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Card Tabs */}
        <div className="flex border-b">
          {creditCards.map((card) => (
            <button
              key={card.id}
              onClick={() => setActiveCard(card.id)}
              className={cn(
                "flex-1 py-3 px-4 text-center font-medium transition-colors border-r last:border-r-0",
                activeCard === card.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent",
              )}
            >
              {card.name}
              <div className="text-xs opacity-75">**** {card.lastFourDigits}</div>
            </button>
          ))}
        </div>

        {/* Card Content */}
        {activeCardData && (
          <div className="p-4">
            <div className="mb-4">
              <div className="text-lg font-semibold tnum">Total: ₹{activeCardData.totalAmount.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">{activeCardData.transactions.length} transactions</div>
            </div>

            <div className="space-y-3">
              {activeCardData.transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{transaction.description}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {transaction.category}
                        </Badge>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(transaction.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center font-semibold tnum text-destructive-text">
                      <IndianRupee className="w-4 h-4" />
                      {transaction.amount.toLocaleString()}
                    </div>
                    <StatusBadge status={transaction.status} className="mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
