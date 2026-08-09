"use client"

import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { useState, useEffect, useRef } from "react"
import { format, parseISO } from "date-fns"
import { Plus, ReceiptText, SearchX, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toTransactionId, SYNTHETIC_ROW_MESSAGE } from "@/lib/tx-id"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import TransactionViewDialog from "@/components/transaction-view-dialog"
import TransactionsTable from "@/components/transactions/transactions-table"
import TransactionsToolbar, {
  BulkActionBar,
  type Density,
} from "@/components/transactions/transactions-toolbar"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states"
import TransactionForm from "@/components/transaction-form"
import MonthCalendar from "@/components/month-calendar"
import LayoutWrapper from "@/components/layout-wrapper"
import { expenseCategories, incomeCategories, investmentCategories } from "@/components/dashboard"
import * as LucideIcons from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import RecurringManageModal from "@/components/recurring-manage-modal"
import RecurringGenerateModal from "@/components/recurring-generate-modal"

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
  owner_type?: string | null
  expense_type?: string | null
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
  ownerType?: string | null
  expenseType?: "fixed" | "variable" | null
  isSummary?: boolean
  summaryType?: "credit" | "petty-cash" | "investment"
}

// Map API transaction_type string → frontend TxType
const apiTypeToTxType = (apiType: string): Transaction["type"] => {
  switch (apiType) {
    case "Credit Card":  return "credit"
    case "Petty Cash":   return "petty-cash"
    case "Income":       return "income"
    case "Investment":   return "investment"
    default:             return "expense"
  }
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
    type: apiTypeToTxType(apiTransaction.transaction_type),
    category: apiTransaction.category,
    date: convertDateFormat(apiTransaction.transaction_date),
    dueDate: apiTransaction.due_date ? convertDateFormat(apiTransaction.due_date) : undefined,
    status: apiTransaction.status,
    cardName: apiTransaction.card_name || undefined,
    ownerType: apiTransaction.owner_type ?? "self",
    expenseType: (apiTransaction.expense_type as "fixed" | "variable" | null) ?? null,
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

  // Recurring modals
  const [showRecurringManage, setShowRecurringManage] = useState(false)
  const [showRecurringGenerate, setShowRecurringGenerate] = useState(false)

  // Table view preferences + bulk selection
  const [density, setDensity] = useState<Density>("comfortable")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

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
    // EMI rows are projected from the loan schedule and have no transactions
    // row. Without this guard parseInt("emi_…") yields NaN, JSON turns that
    // into null, and the API rejects it with an unhelpful 400.
    const txnId = toTransactionId(transaction.id)
    if (txnId === null) {
      toast({
        title: "Can't update this row",
        description: SYNTHETIC_ROW_MESSAGE,
        variant: "destructive",
      })
      return
    }

    try {
      const response = await apiClient(apiUrl("transaction/update-status"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: txnId,
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
    // EMI rows are projected from the loan schedule and have no transactions
    // row. Without this guard parseInt("emi_…") yields NaN, JSON turns that
    // into null, and the API rejects it with an unhelpful 400.
    const txnId = toTransactionId(transaction.id)
    if (txnId === null) {
      toast({
        title: "Can't update this row",
        description: SYNTHETIC_ROW_MESSAGE,
        variant: "destructive",
      })
      return
    }

    try {
      const response = await apiClient(apiUrl("transaction/update-status"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: txnId,
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

  const handleDeleteTransaction = async (id: string) => {
    try {
      const response = await apiClient(apiUrl(`transaction/delete/${id}`), {
        method: "DELETE",
      })

      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error((json as any).message || "Delete failed")
      }

      toast({
        title: "Transaction deleted",
        description: "The transaction has been permanently removed.",
        variant: "default",
      })

      // Refresh the list
      refreshTransactions()
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete transaction.",
        variant: "destructive",
      })
    }
  }

  const toggleSort = (column: "date" | "amount") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  // ─── Bulk selection ─────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  /** Select-all applies to the currently filtered rows, minus synthetic EMI rows. */
  const toggleSelectAll = () => {
    const selectable = legacyTransactions
      .filter((t) => !t.id.startsWith("emi_"))
      .map((t) => t.id)

    setSelectedIds((prev) => {
      const allOn = selectable.length > 0 && selectable.every((id) => prev.has(id))
      return allOn ? new Set() : new Set(selectable)
    })
  }

  /**
   * Bulk delete. Synthetic EMI rows are never selectable, so every id here is
   * a real record. Requests run in parallel; partial failures are reported.
   */
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setBulkBusy(true)
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          apiClient(apiUrl(`transaction/delete/${id}`), { method: "DELETE" }).then((r) => {
            if (!r.ok) throw new Error(`Failed to delete ${id}`)
            return r
          }),
        ),
      )

      const failed = results.filter((r) => r.status === "rejected").length
      const succeeded = ids.length - failed

      if (succeeded > 0) {
        toast({
          title: `${succeeded} transaction${succeeded > 1 ? "s" : ""} deleted`,
          description: failed > 0 ? `${failed} could not be deleted.` : undefined,
          variant: failed > 0 ? "destructive" : "default",
        })
      } else {
        toast({
          title: "Delete failed",
          description: "None of the selected transactions could be deleted.",
          variant: "destructive",
        })
      }

      clearSelection()
      refreshTransactions()
    } finally {
      setBulkBusy(false)
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

  // Whether the empty state should read "no matches" vs "nothing here yet"
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    (!!selectedCategory && selectedCategory !== "All") ||
    !!selectedCard

  const clearAllFilters = () => {
    setSearchTerm("")
    handleCategoryFilter("All")
    setSelectedCard(null)
  }

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

  const refreshTransactions = () => {
    const transactionType = getTransactionTypeForTab(activeTab)
    const month = selectedMonth.getMonth() + 1
    const year  = selectedMonth.getFullYear()
    const cardId = activeTab === "credit-cards" && selectedCard && selectedCard !== "all"
      ? getCardIdFromName(selectedCard) : ""
    fetchTransactions(transactionType, month, year, selectedCategory, cardId)
  }

  return (
    <div className="space-y-4 3xl:max-w-7xl 3xl:mx-auto w-full">
      {/* Recurring modals */}
      <RecurringManageModal
        open={showRecurringManage}
        onClose={() => setShowRecurringManage(false)}
      />
      <RecurringGenerateModal
        open={showRecurringGenerate}
        onClose={() => setShowRecurringGenerate(false)}
        month={selectedMonth.getMonth() + 1}
        year={selectedMonth.getFullYear()}
        onGenerated={refreshTransactions}
      />

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            All Transactions
          </h1>
          <MonthCalendar onMonthSelect={handleMonthSelect} defaultMonth={selectedMonth} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRecurringManage(true)}>
            <LucideIcons.Repeat className="mr-1.5 h-4 w-4" />
            Manage recurring
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowRecurringGenerate(true)}>
            <LucideIcons.Zap className="mr-1.5 h-4 w-4" />
            Generate recurring
          </Button>
        </div>
      </div>

      {/* Transaction type tabs — underline style, sized to content rather than
          six stretched full-width segments */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as typeof activeTab)
          clearSelection()
        }}
      >
        <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
          {(
            [
              ["all-transactions", "All"],
              ["income", "Income"],
              ["investments", "Investments"],
              ["expenses", "Expenses"],
              ["credit-cards", "Credit Cards"],
              ["petty-cash", "Petty Cash"],
            ] as const
          ).map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "relative rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors",
                "hover:text-foreground",
                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
              )}
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="overflow-hidden p-0">
            {/* Card header: title + count + primary action */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  {getTabTitle()}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {format(selectedMonth, "MMMM yyyy")}
                  {creditCardSummary && (
                    <>
                      {" · "}
                      <span className="font-medium text-foreground">
                        {creditCardSummary.cardName}
                      </span>
                      {creditCardSummary.dueDate && (
                        <> · due {format(parseISO(creditCardSummary.dueDate), "d MMM")}</>
                      )}
                      {" · "}
                      <span className="tnum font-semibold text-foreground">
                        ₹{creditCardSummary.total.toLocaleString("en-IN")}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <Button onClick={handleAddTransaction} size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add transaction
              </Button>
            </div>

            {/* Bulk action bar — replaces the toolbar while rows are selected */}
            {selectedIds.size > 0 ? (
              <BulkActionBar
                count={selectedIds.size}
                onClear={clearSelection}
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={bulkBusy}
                    onClick={handleBulkDelete}
                    className="h-7 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {bulkBusy ? "Deleting…" : "Delete"}
                  </Button>
                }
              />
            ) : (
              <TransactionsToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryFilter}
                categories={getAvailableCategories()}
                showCardFilter={activeTab === "credit-cards"}
                selectedCard={selectedCard}
                onCardChange={setSelectedCard}
                cards={creditCards}
                density={density}
                onDensityChange={setDensity}
                resultCount={legacyTransactions.length}
                totalCount={transactions.length}
                disabled={loading}
              />
            )}

            {/* Body */}
            {loading ? (
              <SkeletonRows rows={8} columns={5} />
            ) : error ? (
              <ErrorState
                title="Couldn't load transactions"
                description={error}
                onRetry={refreshTransactions}
              />
            ) : legacyTransactions.length > 0 ? (
              <TransactionsTable
                transactions={legacyTransactions}
                density={density}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onToggleSort={toggleSort}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                showDueDate={activeTab === "expenses"}
                showCardColumn={activeTab === "credit-cards" && !selectedCard}
                showCardBadge={activeTab === "all-transactions"}
                onView={handleViewTransaction}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            ) : hasActiveFilters ? (
              <EmptyState
                icon={SearchX}
                title="No matching transactions"
                description={`Nothing matched your current filters. Try broadening your search.`}
                action={
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={ReceiptText}
                title="No transactions yet"
                description={`Nothing recorded for ${format(selectedMonth, "MMMM yyyy")}. Add your first transaction to get started.`}
                action={
                  <Button size="sm" onClick={handleAddTransaction}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add transaction
                  </Button>
                }
              />
            )}
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