"use client"

import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, CreditCard, Tag, User, Layers, IndianRupee } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { getCategoryMeta } from "@/lib/tx-meta"

type TxType = "income" | "expense" | "credit" | "petty-cash" | "investment"
type StatusType = "Pending" | "Paid"

type EditTransaction = {
  id: string
  description: string
  amount: number
  type: TxType
  category: string
  date: string // ISO yyyy-mm-dd
  dueDate?: string
  status?: StatusType
  cardName?: string
  ownerType?: string | null
  expenseType?: "fixed" | "variable" | null
}

type Props = {
  onSubmit: (data: any) => Promise<void> | void
  onCancel: () => void
  editTransaction?: EditTransaction | null
}

// API-normalized card item
type CreditCardItem = { id: number; card_name: string }

// Category sets
const INCOME_CATEGORIES = ["Freelancing", "Interest", "Others", "Salary"]
const EXPENSE_CATEGORIES = [
  "Bike Fuel",
  "Bike Service",
  "Car Accessories",
  "Car Fuel",
  "Car Service",
  "Chitti",
  "Credit Card Payment",
  "Debt",
  "Education",
  "Electronics",
  "EMI",
  "Entertainment",
  "Food",
  "Freelancing",
  "Gadgets",
  "Gardening",
  "Gifts",
  "Healthcare",
  "Housing",
  "Other Expenses",
  "Party",
  "Personal Care",
  "Shopping",
  "Transport",
  "Travel",
  "Utilities",
]
const INVESTMENT_CATEGORIES = ["Chitti", "SIP"]

const OWNER_TYPES = ["self", "brother", "friend", "other"]
const EXPENSE_TYPES: Array<"fixed" | "variable"> = ["fixed", "variable"]

export default function TransactionForm({ onSubmit, onCancel, editTransaction = null }: Props) {
  // Core state
  const [type, setType] = useState<TxType>(editTransaction?.type ?? "expense")
  const [description, setDescription] = useState<string>(editTransaction?.description ?? "")
  const [amount, setAmount] = useState<string>(editTransaction ? String(editTransaction.amount) : "")
  const [category, setCategory] = useState<string>(editTransaction?.category ?? "")
  const [status, setStatus] = useState<StatusType>(editTransaction?.status ?? "Pending")
  const [ownerType, setOwnerType] = useState<string>(editTransaction?.ownerType ?? "self")
  const [expenseType, setExpenseType] = useState<"fixed" | "variable">(editTransaction?.expenseType ?? "variable")
  const [dateOpen, setDateOpen] = useState(false)
  const [dueDateOpen, setDueDateOpen] = useState(false)
  const [date, setDate] = useState<Date>(editTransaction?.date ? new Date(editTransaction.date) : new Date())
  const [dueDate, setDueDate] = useState<Date | undefined>(
    editTransaction?.dueDate ? new Date(editTransaction.dueDate) : undefined,
  )

  // Cards
  const [cards, setCards] = useState<CreditCardItem[]>([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string>("")
  const [selectedCardName, setSelectedCardName] = useState<string>(editTransaction?.cardName ?? "")

  // Derived
  const categories = useMemo(() => {
    switch (type) {
      case "income":
        return INCOME_CATEGORIES
      case "investment":
        return INVESTMENT_CATEGORIES
      default:
        return EXPENSE_CATEGORIES
    }
  }, [type])

  const showExpenseType = type === "expense" || type === "credit" || type === "petty-cash"
  const showDueDate = type === "expense" // Removed Credit Card from showing due date
  const showCardSelect = type === "credit"
  const showStatus = type !== "credit" && type !== "petty-cash"

  // Flags to completely hide fields from UI based on transaction type
  const showExpenseTypeField = type === "expense" || type === "credit" || type === "petty-cash"
  const showDueDateField = type === "expense" // Removed Credit Card from showing due date
  const showStatusField = type !== "credit" && type !== "petty-cash"

  // Fetch credit cards from API using exact shape: data.data.data[]
  const fetchCards = async () => {
    try {
      setCardsLoading(true)
      const res = await apiClient(apiUrl("configurations/listing"), {
        method: "GET",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        mode: "cors",
      })
      const data = await res.json()
      const list = Array.isArray(data?.data?.data) ? (data.data.data as any[]) : []
      const normalized: CreditCardItem[] = list
        .map((c) => ({ id: Number(c?.id), card_name: String(c?.card_name ?? "") }))
        .filter((c) => Number.isFinite(c.id) && c.card_name.length > 0)
      setCards(normalized)

      // Preselect when editing a credit transaction
      if (editTransaction?.type === "credit" && editTransaction.cardName) {
        const found = normalized.find((x) => x.card_name === editTransaction.cardName)
        if (found) {
          setSelectedCardId(String(found.id))
          setSelectedCardName(found.card_name)
        }
      }
    } catch (e) {
      console.error("Failed to load credit cards listing:", e)
      setCards([])
    } finally {
      setCardsLoading(false)
    }
  }

  // Initialize for edit
  useEffect(() => {
    if (type === "credit" && cards.length === 0) {
      fetchCards()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const handleTypeChange = (val: string) => {
    const newType = val as TxType
    setType(newType)
    // Petty cash: always Paid
    if (newType === "petty-cash") setStatus("Paid")
    // If switching to credit, ensure cards loaded
    if (newType === "credit" && cards.length === 0) fetchCards()
  }

  const computeExpenseType = (): "fixed" | "variable" | null => {
    if (type === "expense") return expenseType
    if (type === "credit") return "variable"
    if (type === "petty-cash") return "fixed"
    if (type === "income") return category === "Salary" ? "fixed" : "variable"
    if (type === "investment") return "variable"
    return null
  }

  const toApiType = (t: TxType) => {
    switch (t) {
      case "credit":
        return "Credit Card"
      case "petty-cash":
        return "Petty Cash"
      case "investment":
        return "Investment"
      case "income":
        return "Income"
      default:
        return "Expense"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Build request
    const body: any = {
      transaction_type: toApiType(type),
      description,
      category,
      transaction_date: format(date, "yyyy-MM-dd"),
      due_date: null,
      status: type === "credit" ? "Pending" : type === "petty-cash" ? "Paid" : status,
      amount: Number(amount || 0),
      user_id: "d9d3c6f2-0a1b-4b2d-9ec2-937a1db43f31",
      owner_type: ownerType,
      expense_type: computeExpenseType(),
    }

    const getDueDate = () => {
      if (type === "income" || type === "investment" || type === "petty-cash") {
        return null
      }
      if (type === "expense" && dueDate) {
        return format(dueDate, "yyyy-MM-dd")
      }
      return null
    }

    body.due_date = getDueDate()

    if (showCardSelect) {
      const id = selectedCardId ? Number(selectedCardId) : null
      const name = (id ? cards.find((c) => c.id === id)?.card_name : selectedCardName) || selectedCardName || null
      body.card_id = id
      body.card_name = name
    }

    // Choose endpoint based on edit
    const isUpdate = !!editTransaction?.id
    if (isUpdate) body.id = Number.parseInt(editTransaction!.id)

    const url = isUpdate
      ? apiUrl("transaction/update")
      : apiUrl("transaction/store")

    const res = await apiClient(url, {
      method: isUpdate ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error("API error:", errorData)
      // Still allow parent to close/refresh to keep UX responsive
    }

    await onSubmit(body)
  }

  // Compact, responsive two-column layout
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 2 columns on sm and up; single column on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* ── Row 1: Transaction Type + Credit Card (or empty) ────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="type">Transaction Type</Label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="credit">Credit Card</SelectItem>
              <SelectItem value="petty-cash">Petty Cash</SelectItem>
              <SelectItem value="investment">Investment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Credit Card selector appears right next to type when relevant */}
        {showCardSelect && (
          <div className="space-y-1.5">
            <Label htmlFor="card">Credit Card</Label>
            <Select
              value={selectedCardId || ""}
              onValueChange={(value) => {
                setSelectedCardId(value)
                const found = cards.find((c) => String(c.id) === value)
                setSelectedCardName(found?.card_name || "")
              }}
              disabled={cardsLoading}
            >
              <SelectTrigger id="card">
                <SelectValue placeholder={cardsLoading ? "Loading cards..." : "Select credit card"}>
                  {selectedCardId ? (
                    <span className="inline-flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {cards.find((c) => String(c.id) === selectedCardId)?.card_name || selectedCardName || "Card"}
                    </span>
                  ) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={String(card.id)}>
                    <span className="inline-flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {card.card_name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ── Row 2: Description (full width) ─────────────────────────── */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="Add a short note..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* ── Row 3: Amount + Category ────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (₹)</Label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-9"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category">
                {category && (() => {
                  const { emoji, color } = getCategoryMeta(category)
                  return (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="flex items-center justify-center w-6 h-6 rounded-md text-sm select-none"
                        style={{ backgroundColor: color }}
                      >
                        {emoji}
                      </span>
                      {category}
                    </span>
                  )
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => {
                const { emoji, color } = getCategoryMeta(c)
                return (
                  <SelectItem key={c} value={c}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="flex items-center justify-center w-6 h-6 rounded-md text-sm select-none"
                        style={{ backgroundColor: color }}
                      >
                        {emoji}
                      </span>
                      {c}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* ── Row 4: Transaction Date + Due Date / Status ─────────────── */}
        <div className="space-y-1.5">
          <Label>Transaction Date</Label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  if (d) {
                    setDate(d)
                    setDateOpen(false)
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Due Date sits beside Transaction Date for Expense */}
        {showDueDateField && (
          <div className="space-y-1.5">
            <Label>Due Date (Optional)</Label>
            <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) => {
                    setDueDate(d || undefined)
                    setDueDateOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Status sits beside Transaction Date for non-expense types */}
        {showStatusField && !showDueDateField && (
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusType)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ── Row 5: Status + Owner Type (for Expense which has Due Date above) */}
        {showStatusField && showDueDateField && (
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusType)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ── Row 5/6: Owner Type + Expense Type ──────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="ownerType">Owner Type</Label>
          <Select value={ownerType} onValueChange={setOwnerType}>
            <SelectTrigger id="ownerType">
              <SelectValue placeholder="Select owner">
                <span className="inline-flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {ownerType.charAt(0).toUpperCase() + ownerType.slice(1)}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {OWNER_TYPES.map((o) => (
                <SelectItem key={o} value={o}>
                  <span className="inline-flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showExpenseTypeField && (
          <div className="space-y-1.5">
            <Label htmlFor="expenseType">Expense Type</Label>
            <Select value={expenseType} onValueChange={(v) => setExpenseType(v as "fixed" | "variable")}>
              <SelectTrigger id="expenseType">
                <SelectValue placeholder="Select type">
                  <span className="inline-flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    {expenseType.charAt(0).toUpperCase() + expenseType.slice(1)}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="inline-flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-black text-white hover:bg-gray-800">
          {editTransaction ? "Save Changes" : "Create"}
        </Button>
      </div>
    </form>
  )
}
