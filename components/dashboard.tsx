"use client"

import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ExpenseDistribution from "@/components/expense-distribution"
import MonthCalendar from "@/components/month-calendar"
import { format, subMonths } from "date-fns"
import TransactionViewDialog from "@/components/transaction-view-dialog"
import TransactionForm from "@/components/transaction-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import * as LucideIcons from "lucide-react"
import { Button } from "@/components/ui/button"
import ModernChart from "@/components/modern-chart"
import { useToast } from "@/components/ui/use-toast"
import LoansTab from "@/components/loans-tab"
import SavingsTab from "@/components/savings-tab"
import GoalsTab from "@/components/goals-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, Target } from "lucide-react"
import TransactionTabs from "./transaction-tabs"
import { SearchableSelect } from "@/components/ui/searchable-select"

// API Response Types for Dashboard API ONLY
export type ApiTransaction = {
  id: number
  transaction_type: string
  description: string
  category: string
  transaction_date: string
  due_date: string | null
  status: "Paid" | "Pending"
  amount: number
  card_id: number | null
  card_name: string | null
  owner_type?: string
  expense_type?: string
  payment_id?: number // Added payment_id field for credit card transactions
}

export type CreditCardData = {
  card_id: number
  card_name: string
  transactions: ApiTransaction[]
}

export type FinancialSummary = {
  totalIncome: { value: number; change: number; direction: "up" | "down" }
  totalExpense: { value: number; change: number; direction: "up" | "down" }
  totalInvestment: { value: number; change: number; direction: "up" | "down" }
  balance: { value: number; change: number; direction: "up" | "down" }
}

export type ExpenseDistributionItem = { category: string; amount: number; percentage: number }
export type MonthlyTrendItem = { label: string; Income: number; Expense: number; Investment: number }

export type DashboardApiResponse = {
  status: string
  data: {
    transactions: {
      Income: ApiTransaction[]
      Investment: ApiTransaction[]
      Expense: ApiTransaction[]
      "Credit Card": CreditCardData[] // Changed from CreditCardTransaction[]
      "Petty Cash": ApiTransaction[]
      "All Transactions": ApiTransaction[]
    }
    financialSummary: FinancialSummary
    expenseDistribution: ExpenseDistributionItem[]
    monthlyTrend: MonthlyTrendItem[]
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
  ownerType?: string
  expenseType?: string
  payment_id?: number // Added payment_id field for credit card transactions
}

// Categories
export const expenseCategories = [
  { name: "Food", icon: "utensils" },
  { name: "Transport", icon: "car" },
  { name: "Utilities", icon: "zap" },
  { name: "Entertainment", icon: "tv" },
  { name: "Shopping", icon: "shopping-bag" },
  { name: "Healthcare", icon: "heart" },
  { name: "Education", icon: "book-open" },
  { name: "Housing", icon: "home" },
  { name: "Personal Care", icon: "user" },
  { name: "Travel", icon: "map" },
  { name: "Gifts", icon: "gift" },
  { name: "Chitti", icon: "landmark" },
  { name: "Credit Card Payment", icon: "credit-card" },
  { name: "Freelancing", icon: "briefcase" },
  { name: "Debt", icon: "credit-card" },
  { name: "EMI", icon: "calendar" },
  { name: "Other Expenses", icon: "more-horizontal" },
]

export const incomeCategories = [
  { name: "Salary", icon: "briefcase" },
  { name: "Interest", icon: "percent" },
  { name: "Freelancing", icon: "laptop" },
  { name: "Others", icon: "plus-circle" },
]

export const investmentCategories = [
  { name: "Chitti", icon: "landmark" },
  { name: "SIP", icon: "trending-up" },
]

// Convert API transaction to legacy format for compatibility
const convertApiTransactionToLegacy = (
  apiTransaction: ApiTransaction,
  type: string,
  cardName?: string,
): Transaction => {
  return {
    id: (apiTransaction.id || Math.random()).toString(),
    description: apiTransaction.description,
    amount: apiTransaction.amount,
    type: type.toLowerCase().replace(" ", "-") as Transaction["type"],
    category: apiTransaction.category,
    date: apiTransaction.transaction_date,
    dueDate: apiTransaction.due_date || undefined,
    status: apiTransaction.status,
    cardName: cardName || apiTransaction.card_name || undefined, // Use provided cardName or apiTransaction.card_name
    ownerType: apiTransaction.owner_type,
    expenseType: apiTransaction.expense_type,
    payment_id: apiTransaction.payment_id, // Added payment_id field for credit card transactions
  }
}

// Transform Credit Card transactions (Removed this function as it's no longer needed with the updated API structure)
// const transformCreditCardTransactions = (creditCardData: CreditCardTransaction[]) => {
//   return creditCardData.flatMap((card) =>
//     card.transactions.map((t) => ({
//       id: String(t.payment_id), // Use payment_id as the id
//       payment_id: t.payment_id, // Also store payment_id separately
//       description: t.description,
//       amount: t.amount,
//       type: "credit" as const,
//       category: t.category,
//       date: t.transaction_date,
//       dueDate: t.due_date,
//       status: t.status as "Pending" | "Paid",
//       cardName: card.card_name,
//       isSummary: false,
//     })),
//   )
// }

// Generate last 6 months data
const generateLast6MonthsData = (existingData: MonthlyTrendItem[]): MonthlyTrendItem[] => {
  const months = []
  const currentDate = new Date()
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(currentDate, i)
    const monthLabel = format(date, "MMM yyyy")
    const existingMonth = existingData.find((item) => item.label === monthLabel)
    months.push({
      label: monthLabel,
      Income: existingMonth?.Income || 0,
      Expense: existingMonth?.Expense || 0,
      Investment: existingMonth?.Investment || 0,
    })
  }
  return months
}

// Static fallback data with 6 months
const getStaticFallbackData = (): DashboardApiResponse["data"] => {
  const staticMonthlyTrend = [
    { label: "Apr 2024", Income: 55000, Expense: 45830, Investment: 0 },
    { label: "May 2024", Income: 36000, Expense: 50810, Investment: 0 },
    { label: "Jun 2024", Income: 181420, Expense: 175060, Investment: 0 },
    { label: "Jul 2024", Income: 135399, Expense: 135370, Investment: 0 },
    { label: "Aug 2024", Income: 149580, Expense: 149580, Investment: 0 },
    { label: "Sep 2024", Income: 137140, Expense: 134821, Investment: 0 },
  ]

  const sampleTransactions: ApiTransaction[] = [
    {
      id: 28,
      transaction_type: "Income",
      description: "Yash Salary",
      category: "Salary",
      transaction_date: "2025-01-05",
      due_date: null,
      status: "Paid",
      amount: 18450,
      card_id: null,
      card_name: null,
      owner_type: "self",
      expense_type: "fixed",
    },
    {
      id: 27,
      transaction_type: "Income",
      description: "Main Salary",
      category: "Salary",
      transaction_date: "2025-01-05",
      due_date: null,
      status: "Paid",
      amount: 99800,
      card_id: null,
      card_name: null,
      owner_type: "self",
      expense_type: "fixed",
    },
    {
      id: 40,
      transaction_type: "Expense",
      description: "Diet",
      category: "Food",
      transaction_date: "2025-01-30",
      due_date: "2025-01-30",
      status: "Paid",
      amount: 836,
      card_id: null,
      card_name: "",
      owner_type: "self",
      expense_type: "variable",
    },
  ]

  return {
    transactions: {
      "All Transactions": sampleTransactions,
      Income: sampleTransactions.filter((t) => t.transaction_type === "Income"),
      Investment: [],
      Expense: sampleTransactions.filter((t) => t.transaction_type === "Expense"),
      "Credit Card": [],
      "Petty Cash": [],
    },
    financialSummary: {
      totalIncome: { value: 118250, change: -10702, direction: "down" },
      totalExpense: { value: 78613, change: -51104, direction: "down" },
      totalInvestment: { value: 41000, change: 41000, direction: "up" },
      balance: { value: -1363, change: -598, direction: "down" },
    },
    expenseDistribution: [
      { category: "Housing", amount: 29917, percentage: 38.1 },
      { category: "Transport", amount: 20386, percentage: 25.9 },
      { category: "Utilities", amount: 15977, percentage: 20.3 },
      { category: "Shopping", amount: 6565, percentage: 8.3 },
      { category: "Food", amount: 5768, percentage: 7.3 },
    ],
    monthlyTrend: staticMonthlyTrend,
  }
}

export default function Dashboard() {
  const router = useRouter()
  const { toast } = useToast()

  // Use current month
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(now.getFullYear())

  // Owner filter
  const [selectedOwnerType, setSelectedOwnerType] = useState<string>("")

  // Main tabs
  const [mainTab, setMainTab] = useState<"overview" | "loans" | "savings" | "goals">("overview")

  // Transactions section state
  const [activeTab, setActiveTab] = useState<
    "all-transactions" | "income" | "investments" | "expenses" | "credit-cards" | "petty-cash"
  >("all-transactions")
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showTransactionForm, setShowTransactionForm] = useState(false)

  const [dashboardData, setDashboardData] = useState<DashboardApiResponse["data"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)

  // Epoch counter: incrementing it invalidates any in-flight fetch so stale
  // responses are silently dropped instead of being aborted (which would show
  // "canceled" in the network tab). Each new fetch captures the current epoch;
  // after every await it checks whether a newer fetch has superseded it.
  const fetchEpochRef = useRef(0)

  const ownerTypes = ["self", "brother", "friend", "other"]

  // Single API call function
  const fetchDashboardData = useCallback(async (month: number, year: number, ownerType?: string) => {
    // Capture and bump the epoch. Any previously in-flight fetch that checks
    // the epoch after an await will see a mismatch and discard its response.
    const epoch = ++fetchEpochRef.current

    try {
      setLoading(true)
      setError(null)
      setUsingFallback(false)

      const params = new URLSearchParams({ month: String(month), year: String(year) })
      if (ownerType) params.append("owner_type", ownerType)
      const dashboardUrl = apiUrl("dashboard", params)
      const response = await apiClient(dashboardUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        mode: "cors",
      })

      // A newer fetch has started — discard this stale response
      if (epoch !== fetchEpochRef.current) return

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`)

      const data: DashboardApiResponse = await response.json()

      // Check again after the second await
      if (epoch !== fetchEpochRef.current) return

      if (data.status === "success" && data.data) {
        const processed = {
          ...data.data,
          monthlyTrend: generateLast6MonthsData(data.data.monthlyTrend),
          // No longer need to transform Credit Card transactions here
        }
        setDashboardData(processed)
      } else {
        throw new Error("API returned invalid data structure")
      }
    } catch (e: any) {
      // Drop the error if a newer fetch already superseded this one
      if (epoch !== fetchEpochRef.current) return

      const message =
        e instanceof Error
          ? e.message.includes("Failed to fetch")
            ? "Network error - Unable to reach API server"
            : e.message.includes("CORS")
              ? "CORS error - API not accessible from browser"
              : e.message
          : "Unknown error"

      setError(message)
      setUsingFallback(true)
      setDashboardData(getStaticFallbackData())
    } finally {
      // Only update loading state if this is still the latest fetch
      if (epoch === fetchEpochRef.current) {
        setLoading(false)
      }
    }
  }, [])

  // Fetch on month/year/ownerType changes ONLY
  useEffect(() => {
    fetchDashboardData(currentMonth, currentYear, selectedOwnerType || undefined)
    return () => {
      // Increment epoch to invalidate the in-flight request. The request itself
      // completes normally (shows 200 in the network tab) but its response is
      // silently dropped when it sees the epoch mismatch after the await.
      fetchEpochRef.current++
    }
  }, [currentMonth, currentYear, selectedOwnerType, fetchDashboardData])

  // Month picker
  const handleMonthSelect = useCallback(
    (selectedDate: Date) => {
      const m = selectedDate.getMonth() + 1
      const y = selectedDate.getFullYear()
      if (m !== currentMonth || y !== currentYear) {
        setCurrentMonth(m)
        setCurrentYear(y)
      }
    },
    [currentMonth, currentYear],
  )

  // Owner filter
  const handleOwnerTypeChange = (ownerType: string) => {
    setSelectedOwnerType(ownerType === "all" ? "" : ownerType)
  }

  const cardsWithTransactions = useMemo(() => {
    // Explicitly cast to CreditCardData[]
    const creditCardData = dashboardData?.transactions?.["Credit Card"] as CreditCardData[] | undefined
    if (!creditCardData || !Array.isArray(creditCardData)) return []
    return creditCardData.map((card) => ({
      card_id: card.card_id,
      card_name: card.card_name,
    }))
  }, [dashboardData?.transactions?.["Credit Card"]])

  useEffect(() => {
    if (activeTab === "credit-cards" && cardsWithTransactions.length > 0 && !selectedCard) {
      setSelectedCard(cardsWithTransactions[0].card_name)
    }
  }, [activeTab, cardsWithTransactions, selectedCard])

  // Categories per tab
  const getAvailableCategories = (): string[] => {
    let categories: string[] = []
    switch (activeTab) {
      case "income":
        categories = incomeCategories.map((c) => c.name)
        break
      case "investments":
        categories = investmentCategories.map((c) => c.name)
        break
      case "expenses":
      case "credit-cards":
      case "petty-cash":
      case "all-transactions":
        categories = expenseCategories.map((c) => c.name)
        break
    }
    return ["All", ...categories]
  }

  const getFilteredTransactions = (): Transaction[] => {
    if (!dashboardData?.transactions) return []

    let list: Transaction[] = []

    switch (activeTab) {
      case "all-transactions":
        list = (dashboardData.transactions["All Transactions"] || []).map(
          (t) => convertApiTransactionToLegacy(t, "expense"), // Defaulting type to 'expense' for 'All Transactions'
        )
        break
      case "income":
        list = (dashboardData.transactions.Income || []).map((t) => convertApiTransactionToLegacy(t, "income"))
        break
      case "investments":
        list = (dashboardData.transactions.Investment || []).map((t) => convertApiTransactionToLegacy(t, "investment"))
        break
      case "expenses":
        list = (dashboardData.transactions.Expense || []).map((t) => convertApiTransactionToLegacy(t, "expense"))
        break
      case "credit-cards":
        // Credit Card is an array of card objects with nested transactions
        const creditCardData = dashboardData.transactions["Credit Card"] as CreditCardData[]
        if (creditCardData && Array.isArray(creditCardData)) {
          if (selectedCard) {
            // Find selected card and show only its transactions
            const selectedCardData = creditCardData.find((c) => c.card_name === selectedCard)
            if (selectedCardData) {
              list = selectedCardData.transactions.map((t) =>
                convertApiTransactionToLegacy(t, "credit", selectedCardData.card_name),
              )
            }
          } else {
            // Show all cards' transactions
            list = creditCardData.flatMap((card) =>
              card.transactions.map((t) => convertApiTransactionToLegacy(t, "credit", card.card_name)),
            )
          }
        }
        break
      case "petty-cash":
        list = (dashboardData.transactions["Petty Cash"] || []).map((t) =>
          convertApiTransactionToLegacy(t, "petty-cash"),
        )
        break
    }

    if (selectedCategory !== "All") {
      list = list.filter((t) => t.category === selectedCategory)
    }

    return list
  }

  const handleViewTransaction = (t: Transaction) => setViewingTransaction(t)

  const handleEditTransaction = (t: Transaction) => {
    setEditingTransaction(t)
    setShowTransactionForm(true)
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const res = await apiClient(
        apiUrl(`transaction/delete/${transactionId}`),
        { method: "DELETE", headers: { "Content-Type": "application/json" } },
      )
      if (!res.ok) throw new Error("Failed to delete transaction")
      toast({ title: "Success", description: "Transaction deleted successfully!" })
      await fetchDashboardData(currentMonth, currentYear, selectedOwnerType || undefined)
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete transaction. Please try again.", variant: "destructive" })
    }
  }

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setShowTransactionForm(true)
  }

  const handleTransactionFormSubmit = async (_transactionData: any) => {
    try {
      // Refresh dashboard data after create/update
      await fetchDashboardData(currentMonth, currentYear, selectedOwnerType || undefined)
      setShowTransactionForm(false)
      setEditingTransaction(null)
      toast({ title: "Success", description: "Transaction saved successfully!" })
    } catch (e) {
      toast({ title: "Error", description: "Failed to refresh data.", variant: "destructive" })
    }
  }

  const handleTransactionFormCancel = () => {
    setShowTransactionForm(false)
    setEditingTransaction(null)
  }

  const handleMakePayment = async (transaction: Transaction) => {
    try {
      // Check if this is a credit card transaction
      if (transaction.category === "Credit Card") {
        // For credit card payments, use the new API
        const res = await apiClient(
          apiUrl("transaction/payments/update-status"),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: Number.parseInt(transaction.id),
              payment_date: new Date().toISOString().split("T")[0],
              status: "Paid",
            }),
          },
        )
        if (!res.ok) throw new Error("Failed to update payment status")
      } else {
        // For other transactions, use the old API
        const res = await apiClient(apiUrl("transaction/update-status"), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: Number.parseInt(transaction.id), status: "Paid" }),
        })
        if (!res.ok) throw new Error("Failed to update payment status")
      }

      toast({ title: "Success", description: "Payment status updated to Paid!" })
      await fetchDashboardData(currentMonth, currentYear, selectedOwnerType || undefined)
      setViewingTransaction(null)
    } catch (e) {
      toast({ title: "Error", description: "Failed to update payment status.", variant: "destructive" })
    }
  }

  const handleRevokePayment = async (transaction: Transaction) => {
    try {
      // Check if this is a credit card transaction
      if (transaction.category === "Credit Card") {
        // For credit card payments, use the new API
        const res = await apiClient(
          apiUrl("transaction/payments/update-status"),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: Number.parseInt(transaction.id),
              payment_date: null, // Set payment_date to null when revoking
              status: "Pending",
            }),
          },
        )
        if (!res.ok) throw new Error("Failed to revoke payment status")
      } else {
        // For other transactions, use the old API
        const res = await apiClient(apiUrl("transaction/update-status"), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: Number.parseInt(transaction.id), status: "Pending" }),
        })
        if (!res.ok) throw new Error("Failed to revoke payment status")
      }

      toast({ title: "Success", description: "Payment status revoked to Pending!" })
      await fetchDashboardData(currentMonth, currentYear, selectedOwnerType || undefined)
      setViewingTransaction(null)
    } catch (e) {
      toast({ title: "Error", description: "Failed to revoke payment status.", variant: "destructive" })
    }
  }

  const handleRetry = useCallback(() => {
    fetchDashboardData(currentMonth, currentYear, selectedOwnerType || undefined)
  }, [currentMonth, currentYear, selectedOwnerType, fetchDashboardData])

  // Handle tab change
  const handleTabChange = (
    tab: "all-transactions" | "income" | "investments" | "expenses" | "credit-cards" | "petty-cash",
  ) => {
    setActiveTab(tab)
    setSelectedCategory("All")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2">Loading dashboard...</div>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Failed to load dashboard data</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <Button onClick={handleRetry}>Retry</Button>
        </div>
      </div>
    )
  }

  const { financialSummary, expenseDistribution, monthlyTrend } = dashboardData
  const selectedMonthDate = new Date(currentYear, currentMonth - 1, 1)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <MonthCalendar onMonthSelect={handleMonthSelect} defaultMonth={selectedMonthDate} />
          {/* Removed duplicate month/year badge */}
          <SearchableSelect
            value={selectedOwnerType || "all"}
            onValueChange={handleOwnerTypeChange}
            placeholder="Owner"
            searchPlaceholder="Search owner…"
            className="w-36"
            options={[
              { value: "all", label: "All Owners" },
              ...ownerTypes.map((o) => ({
                value: o,
                label: o.charAt(0).toUpperCase() + o.slice(1),
              })),
            ]}
          />
          {usingFallback && (
            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
              ⚠️ Using demo data
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-orange-800">API Connection Issue</div>
                <div className="text-sm text-orange-700">{error}</div>
                <div className="text-xs text-orange-600 mt-1">
                  {usingFallback ? "Showing demo data instead" : "Please try again"}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Income */}
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Income</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{financialSummary.totalIncome.value.toLocaleString("en-IN")}
                </p>
                <div className={cn(
                  "inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium",
                  financialSummary.totalIncome.direction === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {financialSummary.totalIncome.direction === "up"
                    ? <TrendingUp className="h-3 w-3" />
                    : <TrendingDown className="h-3 w-3" />}
                  ₹{Math.abs(financialSummary.totalIncome.change).toLocaleString("en-IN")} vs last month
                </div>
              </div>
              <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-green-500 text-2xl select-none flex-shrink-0">
                💰
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Investments */}
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Investments</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{financialSummary.totalInvestment.value.toLocaleString("en-IN")}
                </p>
                <div className={cn(
                  "inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium",
                  financialSummary.totalInvestment.direction === "up" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                )}>
                  {financialSummary.totalInvestment.direction === "up"
                    ? <TrendingUp className="h-3 w-3" />
                    : <TrendingDown className="h-3 w-3" />}
                  ₹{Math.abs(financialSummary.totalInvestment.change).toLocaleString("en-IN")} vs last month
                </div>
              </div>
              <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-500 text-2xl select-none flex-shrink-0">
                📈
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Expenses</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{financialSummary.totalExpense.value.toLocaleString("en-IN")}
                </p>
                <div className={cn(
                  "inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium",
                  financialSummary.totalExpense.direction === "down" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {financialSummary.totalExpense.direction === "down"
                    ? <TrendingDown className="h-3 w-3" />
                    : <TrendingUp className="h-3 w-3" />}
                  ₹{Math.abs(financialSummary.totalExpense.change).toLocaleString("en-IN")} vs last month
                </div>
              </div>
              <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-red-500 text-2xl select-none flex-shrink-0">
                💸
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Balance</p>
                <p className={cn(
                  "text-2xl font-bold",
                  financialSummary.balance.value >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {financialSummary.balance.value < 0 ? "−" : ""}₹{Math.abs(financialSummary.balance.value).toLocaleString("en-IN")}
                </p>
                <div className={cn(
                  "inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium",
                  financialSummary.balance.direction === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {financialSummary.balance.direction === "up"
                    ? <TrendingUp className="h-3 w-3" />
                    : <TrendingDown className="h-3 w-3" />}
                  ₹{Math.abs(financialSummary.balance.change).toLocaleString("en-IN")} vs last month
                </div>
              </div>
              <span
                className="flex items-center justify-center w-11 h-11 rounded-2xl text-2xl select-none flex-shrink-0"
                style={{ backgroundColor: financialSummary.balance.value >= 0 ? "#10b981" : "#f97316" }}
              >
                ⚖️
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tab Navigation */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted p-1 rounded-lg">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="loans"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <CreditCard className="h-4 w-4" />
            Loans
          </TabsTrigger>
          <TabsTrigger
            value="savings"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <TrendingUp className="h-4 w-4" />
            Savings
          </TabsTrigger>
          <TabsTrigger
            value="goals"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Target className="h-4 w-4" />
            Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Income vs Expenses vs Investments</CardTitle>
                <CardDescription>Last 6 months financial overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ModernChart monthlyTrend={monthlyTrend} />
                </div>
              </CardContent>
            </Card>
            <ExpenseDistribution expenseDistribution={expenseDistribution} />
          </div>

          {/* Transaction Tabs */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Transactions</h2>
            <Button onClick={handleAddTransaction} className="bg-black text-white hover:bg-gray-800">
              + Add Transaction
            </Button>
          </div>

          <TransactionTabs
            activeTab={activeTab}
            handleTabChange={handleTabChange}
            selectedCategory={selectedCategory}
            handleCategoryChange={setSelectedCategory}
            cardsWithTransactions={cardsWithTransactions}
            selectedCard={selectedCard}
            setSelectedCard={setSelectedCard}
            getFilteredTransactions={getFilteredTransactions}
            handleViewTransaction={handleViewTransaction}
            handleEditTransaction={handleEditTransaction}
            handleDeleteTransaction={handleDeleteTransaction}
          />
        </TabsContent>

        <TabsContent value="loans" className="mt-6">
          <LoansTab />
        </TabsContent>
        <TabsContent value="savings" className="mt-6">
          <SavingsTab />
        </TabsContent>
        <TabsContent value="goals" className="mt-6">
          <GoalsTab />
        </TabsContent>
      </Tabs>

      {/* Transaction Form Dialog */}
      <Dialog open={showTransactionForm} onOpenChange={setShowTransactionForm}>
        <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? "Edit Transaction" : "Add New Transaction"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            onSubmit={handleTransactionFormSubmit}
            onCancel={handleTransactionFormCancel}
            editTransaction={editingTransaction}
          />
        </DialogContent>
      </Dialog>

      <TransactionViewDialog
        transaction={viewingTransaction}
        open={!!viewingTransaction}
        onOpenChange={(open) => !open && setViewingTransaction(null)}
        onMakePayment={handleMakePayment}
        onRevokePayment={handleRevokePayment}
        onPaymentComplete={() => {
          fetchDashboardData(currentMonth, currentYear, selectedOwnerType || undefined)
        }}
      />
    </div>
  )
}

// Optional icon helper (not used directly in this file)
function getCategoryIcon(transaction: Transaction) {
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
  // @ts-ignore - dynamic icon
  const Icon = LucideIcons[iconName.charAt(0).toUpperCase() + iconName.slice(1)]
  return Icon || LucideIcons.Circle
}
