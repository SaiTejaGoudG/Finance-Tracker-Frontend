"use client"

import React from "react"
import { format, parseISO } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/status-badge"
import TransactionActions from "@/components/transaction-actions"
import { ArrowDownIcon, ArrowUpIcon, Search, ReceiptText } from "lucide-react"
import { getCategoryMeta, getTypeColor } from "@/lib/tx-meta"
import { cn } from "@/lib/utils"

import type { Transaction as DashboardTransaction } from "@/components/dashboard"

type Transaction = DashboardTransaction

type TabKey = "all-transactions" | "income" | "investments" | "expenses" | "credit-cards" | "petty-cash"

type Props = {
  activeTab: TabKey
  handleTabChange: (tab: TabKey) => void

  // Filters from parent (category)
  selectedCategory: string
  handleCategoryChange: (category: string) => void

  // Credit card helpers
  cardsWithTransactions: Array<{ card_id: number; card_name: string } | any> | any[]
  selectedCard: string | null
  setSelectedCard: (cardName: string | null) => void

  // Data + handlers
  getFilteredTransactions: () => Transaction[]
  handleViewTransaction: (t: Transaction) => void
  handleEditTransaction: (t: Transaction) => void
  handleDeleteTransaction: (id: string) => void
}

const expenseTypeOptions = ["All", "fixed", "variable"]

export default function TransactionTabs(props: Props) {
  const {
    activeTab,
    handleTabChange,
    selectedCategory,
    handleCategoryChange,
    cardsWithTransactions,
    selectedCard,
    setSelectedCard,
    getFilteredTransactions,
    handleViewTransaction,
    handleEditTransaction,
    handleDeleteTransaction,
  } = props

  // Local-only UI states (no API calls on change)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"date" | "amount">("date")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")
  const [selectedExpenseType, setSelectedExpenseType] = React.useState<string>("All")

  const baseTransactions = getFilteredTransactions()

  // Build category options from current transactions
  const categoryOptions = React.useMemo(() => {
    const set = new Set<string>()
    baseTransactions.forEach((t) => {
      if (t.category) set.add(t.category)
    })
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [baseTransactions])

  // Client-side filter: search term
  const searched = React.useMemo(() => {
    if (!searchTerm) return baseTransactions
    const q = searchTerm.toLowerCase()
    return baseTransactions.filter(
      (t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
    )
  }, [baseTransactions, searchTerm])

  // Client-side filter: expenseType (only for all-transactions and expenses)
  const expenseTypeFiltered = React.useMemo(() => {
    if (!["all-transactions", "expenses"].includes(activeTab)) return searched
    if (selectedExpenseType === "All") return searched
    return searched.filter((t) => (t.expenseType || "").toLowerCase() === selectedExpenseType.toLowerCase())
  }, [searched, activeTab, selectedExpenseType])

  // Sort
  const sorted = React.useMemo(() => {
    const arr = [...expenseTypeFiltered]
    if (sortBy === "date") {
      return arr.sort((a, b) => {
        const dA = new Date(a.date).getTime()
        const dB = new Date(b.date).getTime()
        return sortOrder === "asc" ? dA - dB : dB - dA
      })
    } else {
      return arr.sort((a, b) => (sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount))
    }
  }, [expenseTypeFiltered, sortBy, sortOrder])

  const toggleSort = (column: "date" | "amount") => {
    if (sortBy === column) setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
    else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  // Credit card summary strip — only when a specific card is selected
  const creditCardSummary = React.useMemo(() => {
    if (activeTab !== "credit-cards" || !selectedCard) return null
    const total = sorted.reduce((sum, t) => sum + t.amount, 0)
    const dueDate = sorted.find((t) => t.dueDate)?.dueDate ?? null
    return { total, dueDate, cardName: selectedCard }
  }, [activeTab, selectedCard, sorted])

  // Category and ExpenseType filter row (below tabs)
  const FiltersRow = (
    <div className="flex flex-col sm:flex-row gap-4 mt-4">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Category filter */}
      <div className="w-full sm:w-48">
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expense Type filter: only for All Transactions and Expenses tabs */}
      {["all-transactions", "expenses"].includes(activeTab) && (
        <div className="w-full sm:w-48">
          <Select value={selectedExpenseType} onValueChange={setSelectedExpenseType}>
            <SelectTrigger>
              <SelectValue placeholder="Expense Type" />
            </SelectTrigger>
            <SelectContent>
              {expenseTypeOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt === "All" ? "All Types" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Credit card filter when in credit-cards tab and cards available */}
      {activeTab === "credit-cards" && Array.isArray(cardsWithTransactions) && cardsWithTransactions.length > 0 && (
        <div className="w-full sm:w-56">
          <Select
            value={selectedCard || "all"}
            onValueChange={(value) => setSelectedCard(value === "all" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by card" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cards</SelectItem>
              {cardsWithTransactions.map((c: any) => (
                <SelectItem key={c.card_id} value={c.card_name}>
                  {c.card_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )

  return (
    <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabKey)}>
      <TabsList className="grid w-full grid-cols-6 bg-muted">
        <TabsTrigger
          value="all-transactions"
          className="data-[state=active]:bg-black data-[state=active]:text-white text-sm"
        >
          All Transactions
        </TabsTrigger>
        <TabsTrigger value="income" className="data-[state=active]:bg-black data-[state=active]:text-white text-sm">
          Income
        </TabsTrigger>
        <TabsTrigger
          value="investments"
          className="data-[state=active]:bg-black data-[state=active]:text-white text-sm"
        >
          Investments
        </TabsTrigger>
        <TabsTrigger value="expenses" className="data-[state=active]:bg-black data-[state=active]:text-white text-sm">
          Expenses
        </TabsTrigger>
        <TabsTrigger
          value="credit-cards"
          className="data-[state=active]:bg-black data-[state=active]:text-white text-sm"
        >
          Credit Cards
        </TabsTrigger>
        <TabsTrigger value="petty-cash" className="data-[state=active]:bg-black data-[state=active]:text-white text-sm">
          Petty Cash
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab} className="mt-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {activeTab === "all-transactions"
                    ? "All Transactions History"
                    : activeTab === "income"
                      ? "Income History"
                      : activeTab === "investments"
                        ? "Investment History"
                        : activeTab === "expenses"
                          ? "Expense History"
                          : activeTab === "credit-cards"
                            ? "Credit Card History"
                            : "Petty Cash History"}
                </CardTitle>
                <CardDescription className="text-sm">
                  {sorted.length > 0
                    ? `Showing ${sorted.length} transaction${sorted.length > 1 ? "s" : ""}`
                    : "No transactions found"}
                </CardDescription>
              </div>
            </div>

            {/* Credit card summary strip — compact pill, only when a specific card is selected */}
            {creditCardSummary && (
              <div className="inline-flex items-center gap-2 mt-3 px-3.5 py-2 bg-muted/70 border rounded-2xl text-sm w-fit">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-violet-100 text-base select-none">
                  💳
                </span>
                <span className="font-semibold text-foreground">{creditCardSummary.cardName}</span>
                {creditCardSummary.dueDate && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground text-xs">
                      Due: <span className="font-medium text-foreground">{format(parseISO(creditCardSummary.dueDate), "dd MMM yyyy")}</span>
                    </span>
                  </>
                )}
                <span className="text-muted-foreground/50">·</span>
                <span className="text-muted-foreground text-xs">
                  Total: <span className="font-semibold text-violet-600">₹{creditCardSummary.total.toLocaleString("en-IN")}</span>
                </span>
              </div>
            )}

            {/* Filters Row: search + category + (expenseType for All/Expense) + (card for Credit) */}
            {FiltersRow}
          </CardHeader>

          <CardContent>
            {sorted.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%]">Transaction</TableHead>
                    <TableHead className="w-[14%]">
                      <Button
                        variant="ghost"
                        className="flex items-center p-0 font-medium"
                        onClick={() => toggleSort("date")}
                      >
                        Date
                        {sortBy === "date" &&
                          (sortOrder === "asc" ? (
                            <ArrowUpIcon className="ml-1 h-4 w-4" />
                          ) : (
                            <ArrowDownIcon className="ml-1 h-4 w-4" />
                          ))}
                      </Button>
                    </TableHead>
                    {/* Due Date: only for Expenses tab (not Credit Cards — shown in summary strip) */}
                    {activeTab === "expenses" && (
                      <TableHead className="w-[12%]">Due Date</TableHead>
                    )}
                    <TableHead className="w-[10%] text-center">Status</TableHead>
                    <TableHead className="w-[15%]">
                      <Button
                        variant="ghost"
                        className="flex items-center p-0 font-medium"
                        onClick={() => toggleSort("amount")}
                      >
                        Amount
                        {sortBy === "amount" &&
                          (sortOrder === "asc" ? (
                            <ArrowUpIcon className="ml-1 h-4 w-4" />
                          ) : (
                            <ArrowDownIcon className="ml-1 h-4 w-4" />
                          ))}
                      </Button>
                    </TableHead>
                    {/* Card column: only when All Cards is selected (no specific card filter) */}
                    {activeTab === "credit-cards" && !selectedCard && (
                      <TableHead className="w-[12%]">Card</TableHead>
                    )}
                    <TableHead className="w-[8%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sorted.map((transaction) => {
                    const { emoji, color } = getCategoryMeta(transaction.category)
                    const colors = getTypeColor(transaction.type)
                    return (
                      <TableRow key={transaction.id} className="hover:bg-muted/40 transition-colors">
                        {/* Description + emoji icon */}
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-lg select-none"
                              style={{ backgroundColor: color }}
                            >
                              {emoji}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{transaction.description}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs text-muted-foreground truncate">{transaction.category}</p>
                                {/* Card name badge — shown in All Transactions for credit-type rows */}
                                {activeTab === "all-transactions" && transaction.type === "credit" && transaction.cardName && (
                                  <span className="inline-flex items-center gap-0.5 text-xs text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    💳 {transaction.cardName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {transaction.date ? format(parseISO(transaction.date), "dd MMM yyyy") : "—"}
                        </TableCell>

                        {/* Due Date — only for Expenses tab */}
                        {activeTab === "expenses" && (
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {transaction.dueDate ? format(parseISO(transaction.dueDate), "dd MMM yyyy") : "—"}
                          </TableCell>
                        )}

                        {/* Status */}
                        <TableCell className="text-center">
                          <StatusBadge status={transaction.status || "Pending"} />
                        </TableCell>

                        {/* Amount — colored by type */}
                        <TableCell className="whitespace-nowrap">
                          <span className={cn("text-sm font-semibold", colors.amountText)}>
                            {colors.amountPrefix}₹{transaction.amount.toLocaleString("en-IN")}
                          </span>
                        </TableCell>

                        {/* Card column — only when All Cards is selected */}
                        {activeTab === "credit-cards" && !selectedCard && (
                          <TableCell>
                            {transaction.cardName
                              ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{transaction.cardName}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        )}

                        {/* Actions */}
                        <TableCell className="text-right">
                          <TransactionActions
                            transaction={transaction}
                            onView={handleViewTransaction}
                            onEdit={handleEditTransaction}
                            onDelete={handleDeleteTransaction}
                            showEditOption={true}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-4">
                  <ReceiptText className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {searchTerm ? "No results found" : "No transactions yet"}
                </p>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  {searchTerm
                    ? `Nothing matched "${searchTerm}". Try a different search or clear your filters.`
                    : "No transactions found for the selected period or filters."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
