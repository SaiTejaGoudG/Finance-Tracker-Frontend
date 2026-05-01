"use client"

import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"
import { CalendarIcon, CreditCard, Tag, User, Layers, IndianRupee } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { getCategoryMeta } from "@/lib/tx-meta"
import { incomeCategories, expenseCategories, investmentCategories } from "@/lib/data"

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
const INCOME_CATEGORIES     = [...incomeCategories].sort()
const EXPENSE_CATEGORIES    = [...expenseCategories].sort()
const INVESTMENT_CATEGORIES = [...investmentCategories].sort()

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
          <Label>Transaction Type</Label>
          <SearchableSelect
            value={type}
            onValueChange={handleTypeChange}
            placeholder="Select type"
            searchPlaceholder="Search type…"
            options={[
              { value: "income",     label: "Income" },
              { value: "expense",    label: "Expense" },
              { value: "credit",     label: "Credit Card" },
              { value: "petty-cash", label: "Petty Cash" },
              { value: "investment", label: "Investment" },
            ]}
          />
        </div>

        {/* Credit Card selector appears right next to type when relevant */}
        {showCardSelect && (
          <div className="space-y-1.5">
            <Label>Credit Card</Label>
            <SearchableSelect
              value={selectedCardId || ""}
              onValueChange={(value) => {
                setSelectedCardId(value)
                const found = cards.find((c) => String(c.id) === value)
                setSelectedCardName(found?.card_name || "")
              }}
              disabled={cardsLoading}
              placeholder={cardsLoading ? "Loading cards…" : "Select credit card"}
              searchPlaceholder="Search card…"
              options={cards.map((card) => ({
                value: String(card.id),
                label: card.card_name,
                icon: <CreditCard className="h-4 w-4 text-muted-foreground" />,
              }))}
            />
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
          <Label>Category</Label>
          <SearchableSelect
            value={category}
            onValueChange={setCategory}
            placeholder="Select category"
            searchPlaceholder="Search category…"
            options={categories.map((c) => {
              const { emoji, color } = getCategoryMeta(c)
              return {
                value: c,
                label: c,
                icon: (
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-md text-sm select-none shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {emoji}
                  </span>
                ),
              }
            })}
          />
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
            <Label>Status</Label>
            <SearchableSelect
              value={status}
              onValueChange={(v) => setStatus(v as StatusType)}
              placeholder="Select status"
              searchPlaceholder="Search status…"
              options={[
                { value: "Pending", label: "Pending" },
                { value: "Paid",    label: "Paid" },
              ]}
            />
          </div>
        )}

        {/* ── Row 5: Status + Owner Type (for Expense which has Due Date above) */}
        {showStatusField && showDueDateField && (
          <div className="space-y-1.5">
            <Label>Status</Label>
            <SearchableSelect
              value={status}
              onValueChange={(v) => setStatus(v as StatusType)}
              placeholder="Select status"
              searchPlaceholder="Search status…"
              options={[
                { value: "Pending", label: "Pending" },
                { value: "Paid",    label: "Paid" },
              ]}
            />
          </div>
        )}

        {/* ── Row 5/6: Owner Type + Expense Type ──────────────────────── */}
        <div className="space-y-1.5">
          <Label>Owner Type</Label>
          <SearchableSelect
            value={ownerType}
            onValueChange={setOwnerType}
            placeholder="Select owner"
            searchPlaceholder="Search owner…"
            options={OWNER_TYPES.map((o) => ({
              value: o,
              label: o.charAt(0).toUpperCase() + o.slice(1),
              icon: <User className="h-4 w-4 text-muted-foreground" />,
            }))}
          />
        </div>

        {showExpenseTypeField && (
          <div className="space-y-1.5">
            <Label>Expense Type</Label>
            <SearchableSelect
              value={expenseType}
              onValueChange={(v) => setExpenseType(v as "fixed" | "variable")}
              placeholder="Select type"
              searchPlaceholder="Search type…"
              options={EXPENSE_TYPES.map((t) => ({
                value: t,
                label: t.charAt(0).toUpperCase() + t.slice(1),
                icon: <Layers className="h-4 w-4 text-muted-foreground" />,
              }))}
            />
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
