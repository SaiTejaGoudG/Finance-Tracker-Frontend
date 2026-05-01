"use client"

import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { useState, useEffect, useRef } from "react"
import { format, parseISO } from "date-fns"
import { ArrowDownIcon, ArrowUpIcon, Search, Plus, ReceiptText } from "lucide-react"
import { getCategoryMeta, getTypeColor } from "@/lib/tx-meta"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import StatusBadge from "@/components/status-badge"
import TransactionActions from "@/components/transaction-actions"
import TransactionViewDialog from "@/components/transaction-view-dialog"
import TransactionForm from "@/components/transaction-form"
import MonthCalendar from "@/components/month-calendar"
import LayoutWrapper from "@/components/layout-wrapper"
import { expenseCategories, incomeCategories, investmentCategories } from "@/components/dashboard"
import * as LucideIcons from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// API Response Types for Transactions Listing
type ApiTransaction = {
  id: number
  transaction_type: string
  description: string
  category: string
  transaction_date: string // Format: "05-06-2025"
  due_date: string | null
  status: "Paid" | "Pending"
  amount: number
  card_id: number | null
  card_name: string | null
}

type TransactionsListingResponse = {
  status: string
  message: string
  data: {
    status: boolean
    data: ApiTransaction[] // The actual transactions array is here
    totalAmount: number
    pagination: {
      total: number
      currentPage: number
      perPage: number
      totalPages: number
    }
  }
}

// Legacy Transaction type for compatibility
export type Transaction = {
  id: string
  description: string
  amount: number
  type: "income" | "expense" | "credit" | "petty-cash" | "investment" | "summary"
  category: string
  date: string
  dueDate?: string
  status?: "Pending" | "Paid"
  cardName?: string
  isSummary?: boolean
  summaryType?: "credit" | "petty-cash" | "investment"
}

// Convert API transaction to legacy format
const convertApiTransactionToLegacy = (apiTransaction: ApiTransaction): Transaction => {
  // Convert date format from "05-06-2025" to "2025-06-05"
  const convertDateFormat = (dateStr: string): string => {
    const [day, month, year] = dateStr.split("-")
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  return {
    id: apiTransaction.id.toString(),
    description: apiTransaction.description,
    amount: apiTransaction.amount,
    type: apiTransaction.transaction_type.toLowerCase().replace(" ", "-") as Transaction["type"],
    category: apiTransaction.category,
    date: convertDateFormat(apiTransaction.transaction_date),
    dueDate: apiTransaction.due_date ? convertDateFormat(apiTransaction.due_date) : undefined,
    status: apiTransaction.status,
    cardName: apiTransaction.card_name || undefined,
  }
}

function TransactionsPageContent() {
  const { toast } = useToast()

  // FIXED: Match dashboard tabs structure - All Transactions first
  const [activeTab, setActiveTab] = useState<
    "all-transactions" | "income" | "investments" | "expenses" | "credit-cards" | "petty-cash"
  >("all-transactions")
  const [transactions, setTransactions] = useState<ApiTransaction[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("All")

  // Use current month instead of hardcoded June
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<Date>(
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
  )

  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "amount">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [totalAmount, setTotalAmount] = useState<number>(0)

  // Use ref to prevent duplicate API calls
  const isFetchingRef = useRef(false)

  // Map tab names to API transaction types
  const getTransactionTypeForTab = (tab: string): string => {
    switch (tab) {
      case "all-transactions":
        return "" // Don't pass transaction_type for All Transactions
      case "income":
        return "Income"
      case "investments":
        return "Investment"
      case "expenses":
        return "Expense"
      case "credit-cards":
        return "Credit Card"
      case "petty-cash":
        return "Petty Cash"
      default:
        return "Income"
    }
  }

  // Get card ID from card name
  const getCardIdFromName = (cardName: string): string => {
    const cardMapping: Record<string, string> = {
      "Amazon ICICI": "1",
      "Axis MY Zone": "4",
      "HDFC Regalia": "2",
      "SBI SimplyCLICK": "3",
    }
    return cardMapping[cardName] || "1"
  }

  // Fetch transactions using the listing API
  const fetchTransactions = async (
    transactionType: string,
    month: number,
    year: number,
    category = "",
    cardId = "",
  ) => {
    if (isFetchingRef.current) {
      console.log(`🚫 Already fetching transactions, skipping duplicate call`)
      return
    }

    isFetchingRef.current = true

    try {
      setLoading(true)
      setError(null)

      console.log(
        `🚀 Fetching transactions: type=${transactionType}, month=${month}, year=${year}, category=${category}, cardId=${cardId}`,
      )

      const params = new URLSearchParams({
        month: month.toString(),
        year: year.toString(),
        page: "1",
        limit: "100",
        sort_column: "transaction_date",
        sort_order: "desc",
      })

      if (transactionType) {
        params.append("transaction_type", transactionType)
      }

      if (category && category !== "All") {
        params.append("category", category)
      }

      if (cardId && cardId !== "all") {
        params.append("card_id", cardId)
      }

      const listingUrl = apiUrl("transaction/listing", params)
      console.log(`📡 Transactions API URL: ${listingUrl}`)

      const response = await apiClient(listingUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`)
      }

      const data: TransactionsListingResponse = await response.json()
      console.log("✅ Transactions API Response received:", data)

      if (data.status === "success" && data.data && data.data.status && data.data.data) {
        setTransactions(data.data.data)
        setTotalAmount(data.data.totalAmount || 0)
        console.log(`✅ Loaded ${data.data.data.length} transactions from API`)
        console.log(`💰 Total Amount: ₹${data.data.totalAmount}`)
      } else {
        console.log("⚠️ API returned success but no transactions data")
        setTransactions([])
        setTotalAmount(0)
      }
    } catch (error) {
      console.error("❌ Error fetching transactions:", error)

      let errorMessage = "Failed to load transactions"
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          errorMessage = "Network error - Unable to reach API server"
        } else if (error.message.includes("CORS")) {
          errorMessage = "CORS error - API not accessible"
        } else {
          errorMessage = error.message
        }
      }

      setError(errorMessage)
      setTransactions([])
      setTotalAmount(0)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  // Fetch transactions when tab, month, year, or category changes
  useEffect(() => {
    const transactionType = getTransactionTypeForTab(activeTab)
    const month = selectedMonth.getMonth() + 1
    const year = selectedMonth.getFullYear()

    const cardId =
      activeTab === "credit-cards" && selectedCard && selectedCard !== "all" ? getCardIdFromName(selectedCard) : ""

    fetchTransactions(transactionType, month, year, selectedCategory, cardId)
  }, [activeTab, selectedMonth, selectedCategory, selectedCard])

  const handleMonthSelect = (month: Date) => {
    setSelectedMonth(month)
  }

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category)
  }

  const handleViewTransaction = (transaction: Transaction) => {
    setViewingTransaction(transaction)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setShowTransactionForm(true)
  }

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setShowTransactionForm(true)
  }

  const handleTransactionFormSubmit = async (transactionData: any) => {
    try {
      console.log("🎯 Transaction form submitted successfully")

      // FIXED: Show toast notification for successful transaction
      toast({
        title: "Success",
        description: `Transaction ${editingTransaction ? "updated" : "created"} successfully!`,
        variant: "default",
      })

      // Refresh transactions data after create/update
      const transactionType = getTransactionTypeForTab(activeTab)
      const month = selectedMonth.getMonth() + 1
      const year = selectedMonth.getFullYear()
      const cardId =
        activeTab === "credit-cards" && selectedCard && selectedCard !== "all" ? getCardIdFromName(selectedCard) : ""

      await fetchTransactions(transactionType, month, year, selectedCategory, cardId)

      setShowTransactionForm(false)
      setEditingTransaction(null)
    } catch (error) {
      console.error("Error saving transaction:", error)
      toast({
        title: "Error",
        description: "Failed to save transaction. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleTransactionFormCancel = () => {
    setShowTransactionForm(false)
    setEditingTransaction(null)
  }

  const handleMakePayment = async (transaction: Transaction) => {
    try {
      const response = await apiClient(apiUrl("transaction/update-status"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number.parseInt(transaction.id),
          status: "Paid",
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Payment status updated to Paid!",
          variant: "default",
        })

        const transactionType = getTransactionTypeForTab(activeTab)
        const month = selectedMonth.getMonth() + 1
        const year = selectedMonth.getFullYear()
        const cardId =
          activeTab === "credit-cards" && selectedCard && selectedCard !== "all" ? getCardIdFromName(selectedCard) : ""

        await fetchTransactions(transactionType, month, year, selectedCategory, cardId)
        setViewingTransaction(null)
      } else {
        throw new Error("Failed to update payment status")
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
      toast({
        title: "Error",
        description: "Failed to update payment status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRevokePayment = async (transaction: Transaction) => {
    try {
      const response = await apiClient(apiUrl("transaction/update-status"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number.parseInt(transaction.id),
          status: "Pending",
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Payment status updated to Pending!",
          variant: "default",
        })

        const transactionType = getTransactionTypeForTab(activeTab)
        const month = selectedMonth.getMonth() + 1
        const year = selectedMonth.getFullYear()
        const cardId =
          activeTab === "credit-cards" && selectedCard && selectedCard !== "all" ? getCardIdFromName(selectedCard) : ""

        await fetchTransactions(transactionType, month, year, selectedCategory, cardId)
        setViewingTransaction(null)
      } else {
        throw new Error("Failed to update payment status")
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
      toast({
        title: "Error",
        description: "Failed to update payment status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTransaction = (id: string) => {
    console.log("Delete transaction:", id)
  }

  const toggleSort = (column: "date" | "amount") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  // Get available categories for the current tab
  const getAvailableCategories = (): string[] => {
    let categories: string[] = []

    switch (activeTab) {
      case "income":
        categories = incomeCategories.map((cat) => cat.name)
        break
      case "investments":
        categories = investmentCategories.map((cat) => cat.name)
        break
      case "expenses":
      case "credit-cards":
      case "petty-cash":
      case "all-transactions":
        categories = expenseCategories.map((cat) => cat.name)
        break
    }

    return ["All", ...categories]
  }

  // Filter and sort transactions
  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === "date") {
      const dateA = new Date(a.transaction_date.split("-").reverse().join("-")).getTime()
      const dateB = new Date(b.transaction_date.split("-").reverse().join("-")).getTime()
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA
    } else {
      return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount
    }
  })

  // Convert to legacy format for display
  const legacyTransactions = sortedTransactions.map(convertApiTransactionToLegacy)

  // Credit card summary strip — only when a specific card is selected
  const creditCardSummary = (() => {
    if (activeTab !== "credit-cards" || !selectedCard) return null
    const total = legacyTransactions.reduce((sum, t) => sum + t.amount, 0)
    const dueDate = legacyTransactions.find((t) => t.dueDate)?.dueDate ?? null
    return { total, dueDate, cardName: selectedCard }
  })()

  // Get icon for category (legacy — kept for non-table uses)
  const getCategoryIcon = (transaction: Transaction) => {
    let iconName = "circle"

    if (transaction.type === "income") {
      const category = incomeCategories.find((c) => c.name === transaction.category)
      iconName = category?.icon || "circle"
    } else if (transaction.type === "expense" || transaction.type === "credit") {
      const category = expenseCategories.find((c) => c.name === transaction.category)
      iconName = category?.icon || "circle"
    } else if (transaction.type === "investment") {
      const category = investmentCategories.find((c) => c.name === transaction.category)
      iconName = category?.icon || "trending-up"
    }

    // @ts-ignore - Dynamic icon import
    const Icon = LucideIcons[iconName.charAt(0).toUpperCase() + iconName.slice(1)]
    return Icon || LucideIcons.Circle
  }

  // Get unique credit cards for credit card tab
  const creditCards = [...new Set(transactions.filter((t) => t.card_name).map((t) => t.card_name))] as string[]

  // Get tab title
  const getTabTitle = () => {
    switch (activeTab) {
      case "all-transactions":
        return "All Transactions History"
      case "income":
        return "Income History"
      case "investments":
        return "Investment History"
      case "expenses":
        return "Expense History"
      case "credit-cards":
        return "Credit Card History"
      case "petty-cash":
        return "Petty Cash History"
      default:
        return "Transaction History"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">All Transactions</h1>
          <MonthCalendar onMonthSelect={handleMonthSelect} defaultMonth={selectedMonth} />
        </div>
      </div>

      {/* Debug Info */}
      {/* <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        🔍 Debug: Found {transactions.length} transactions | Total: ₹{totalAmount.toLocaleString("en-IN")} | Tab:{" "}
        {activeTab} | Category: {selectedCategory}
      </div> */}

      {/* Error Banner */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-red-800">API Error</div>
                <div className="text-sm text-red-700">{error}</div>
                <div className="text-xs text-red-600 mt-1">Please check your internet connection and try again</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const transactionType = getTransactionTypeForTab(activeTab)
                  const month = selectedMonth.getMonth() + 1
                  const year = selectedMonth.getFullYear()
                  const cardId =
                    activeTab === "credit-cards" && selectedCard && selectedCard !== "all"
                      ? getCardIdFromName(selectedCard)
                      : ""
                  fetchTransactions(transactionType, month, year, selectedCategory, cardId)
                }}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FIXED: Transaction Type Tabs - Match dashboard structure */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
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
          <TabsTrigger
            value="petty-cash"
            className="data-[state=active]:bg-black data-[state=active]:text-white text-sm"
          >
            Petty Cash
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">{getTabTitle()}</CardTitle>
                  <CardDescription className="text-sm">
                    {loading
                      ? "Loading transactions..."
                      : error
                        ? "Error loading transactions"
                        : legacyTransactions.length > 0
                          ? `Showing ${legacyTransactions.length} transaction${legacyTransactions.length > 1 ? "s" : ""}`
                          : "No transactions found"}
                  </CardDescription>
                </div>
                <Button onClick={handleAddTransaction} className="bg-black text-white hover:bg-gray-800">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
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

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="w-full sm:w-48">
                  <SearchableSelect
                    value={selectedCategory}
                    onValueChange={handleCategoryFilter}
                    disabled={loading}
                    placeholder="Filter by category"
                    searchPlaceholder="Search category…"
                    options={getAvailableCategories().map((cat) => ({ value: cat, label: cat }))}
                  />
                </div>

                {/* Credit Card Filter */}
                {activeTab === "credit-cards" && creditCards.length > 0 && (
                  <div className="w-full sm:w-48">
                    <SearchableSelect
                      value={selectedCard || "all"}
                      onValueChange={(value) => setSelectedCard(value === "all" ? null : value)}
                      disabled={loading}
                      placeholder="Filter by card"
                      searchPlaceholder="Search card…"
                      options={[
                        { value: "all", label: "All Cards" },
                        ...creditCards.map((card) => ({ value: card, label: card })),
                      ]}
                    />
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading transactions from API...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-red-600 mb-2">Failed to load transactions</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
              ) : legacyTransactions.length > 0 ? (
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
                      {/* Due Date: only for Expenses tab */}
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
                      {/* Card column only when All Cards selected */}
                      {activeTab === "credit-cards" && !selectedCard && (
                        <TableHead className="w-[12%]">Card</TableHead>
                      )}
                      <TableHead className="w-[8%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {legacyTransactions.map((transaction) => {
                      const { emoji, color } = getCategoryMeta(transaction.category)
                      const colors = getTypeColor(transaction.type)
                      return (
                        <TableRow key={transaction.id} className="hover:bg-muted/40 transition-colors">
                          {/* Description + iOS emoji icon */}
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
                                  {/* Card badge for credit-type in All Transactions */}
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

                          {/* Due Date — only Expenses tab */}
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

      {/* Transaction Form Dialog */}
      <Dialog open={showTransactionForm} onOpenChange={setShowTransactionForm}>
        <DialogContent className="sm:max-w-[540px] flex flex-col max-h-[90vh] p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>{editingTransaction ? "Edit Transaction" : "Add New Transaction"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-5 py-4">
          <TransactionForm
            onSubmit={handleTransactionFormSubmit}
            onCancel={handleTransactionFormCancel}
            editTransaction={editingTransaction}
          />
          </div>
        </DialogContent>
      </Dialog>

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

// FIXED: Wrap with LayoutWrapper to show sidebar
export default function TransactionsPage() {
  return (
    <LayoutWrapper>
      <TransactionsPageContent />
    </LayoutWrapper>
  )
}