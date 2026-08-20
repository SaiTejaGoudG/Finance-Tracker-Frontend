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
import { Switch } from "@/components/ui/switch"
import { CalendarIcon, CreditCard, Tag, User, Layers, IndianRupee, Users, Plus, X, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { getCategoryMeta } from "@/lib/tx-meta"
import { useToast } from "@/components/ui/use-toast"
import { useCategories, type CategoryType } from "@/hooks/use-categories"
import { ownerTypes as OWNER_TYPES } from "@/lib/data"

type TxType = "income" | "expense" | "credit" | "petty-cash" | "investment" | "asset"
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
  purpose?: "Expense" | "Investment" | "Asset" | null
}

type Props = {
  onSubmit: (data: any) => Promise<void> | void
  onCancel: () => void
  editTransaction?: EditTransaction | null
}

// API-normalized card item
type CreditCardItem = { id: number; card_name: string }

/** A past purchase a refund can be logged against. */
type RefundableTxn = {
  id: number
  description: string
  amount: number
  category: string
  transactionType: string
  transactionDate: string | null
  cardId: number | null
  cardName: string | null
  /** Only set when transactionType is Credit Card — what the original swipe counted toward. */
  purpose: "Expense" | "Investment" | "Asset" | null
  alreadyRefunded: number
  splitParticipants: { id: number; personName: string; amount: number }[]
}

// The form's local TxType -> the transaction_type the categories API stores.
// Credit-card and petty-cash spending is categorised the same way as expenses.
const CATEGORY_TYPE: Record<TxType, CategoryType> = {
  income:       "Income",
  expense:      "Expense",
  credit:       "Credit Card",
  "petty-cash": "Petty Cash",
  investment:   "Investment",
  asset:        "Asset",
}

const EXPENSE_TYPES: Array<"fixed" | "variable"> = ["fixed", "variable"]

// Credit Card is a payment method, not a spending purpose — a card swipe
// could be an ordinary Expense, a business Investment, or an Asset
// purchase. Only shown for Credit Card transactions; defaults to Expense
// so every existing flow behaves exactly as before unless explicitly changed.
const CREDIT_PURPOSES: Array<"Expense" | "Investment" | "Asset"> = ["Expense", "Investment", "Asset"]

export default function TransactionForm({ onSubmit, onCancel, editTransaction = null }: Props) {
  const { toast } = useToast()
  // Core state
  const [type, setType] = useState<TxType>(editTransaction?.type ?? "expense")
  const [description, setDescription] = useState<string>(editTransaction?.description ?? "")
  const [amount, setAmount] = useState<string>(editTransaction ? String(editTransaction.amount) : "")
  const [category, setCategory] = useState<string>(editTransaction?.category ?? "")
  const [status, setStatus] = useState<StatusType>(editTransaction?.status ?? "Pending")
  const [ownerType, setOwnerType] = useState<string>(editTransaction?.ownerType ?? "self")
  const [expenseType, setExpenseType] = useState<"fixed" | "variable">(editTransaction?.expenseType ?? "variable")
  const [purpose, setPurpose] = useState<"Expense" | "Investment" | "Asset">(
    editTransaction?.purpose ?? "Expense",
  )

  // Bill Splitting — create-time only (see backend transactionService.js
  // updateTransaction, which deliberately strips a `split` payload on edit).
  // Each participant's share becomes a receivable in the SAME Borrowings &
  // Lending ledger; whatever's left over is "my share" and is all that
  // counts toward Expense totals for this transaction.
  // Refunds & Cashback — both are CREDITS that reduce what you owe, entered
  // as ordinary transactions with a kind flag. A refund points at the
  // purchase it reverses (so category totals net correctly and the original
  // can show how much came back); cashback stands alone and counts as Income.
  const [txnKind, setTxnKind] = useState<"purchase" | "refund" | "cashback">("purchase")
  const [refundForId, setRefundForId] = useState<string>("")
  const [refundBeneficiaryId, setRefundBeneficiaryId] = useState<string>("")
  const [refundables, setRefundables] = useState<RefundableTxn[]>([])
  const [refundablesLoading, setRefundablesLoading] = useState(false)

  const [splitEnabled, setSplitEnabled] = useState(false)
  const [splitParticipants, setSplitParticipants] = useState<{ name: string; amount: string }[]>([
    { name: "", amount: "" },
  ])
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

  // Credit Card's category list depends on purpose, not just type — a card
  // swipe tagged Investment or Asset should offer those categories (SIP,
  // Chitti, Equipment, Land, ...) instead of generic Credit Card categories,
  // both because they're more relevant AND because the resulting category
  // becomes the linked asset's asset_type when purpose=Asset (see
  // transactionService.syncLinkedAsset on the backend).
  const categoryType: CategoryType =
    type === "credit" && (purpose === "Investment" || purpose === "Asset")
      ? purpose
      : CATEGORY_TYPE[type]

  // Built-in categories merged with the user's custom ones for this type
  const {
    options: categories,
    createCategory,
  } = useCategories(categoryType)
  const [creatingCategory, setCreatingCategory] = useState(false)

  /** Save a typed-in category, then select it. */
  const handleCreateCategory = async (name: string) => {
    setCreatingCategory(true)
    try {
      const created = await createCategory(name)
      if (created) {
        setCategory(created)
        toast({
          title: "Category added",
          description: `"${created}" is now available for ${categoryType} transactions.`,
        })
      }
    } catch (e) {
      toast({
        title: "Couldn't add category",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreatingCategory(false)
    }
  }

  const showExpenseType      = type === "expense" || type === "credit"
  const showDueDate          = type === "expense"
  const showCardSelect       = type === "credit"
  const showStatus           = type !== "credit" && type !== "petty-cash" && type !== "asset"
  const showPurposeSelect    = type === "credit"

  // Flags to completely hide fields from UI based on transaction type
  const showExpenseTypeField = type === "expense" || type === "credit"
  const showDueDateField     = type === "expense"
  const showStatusField      = type !== "credit" && type !== "petty-cash" && type !== "asset"
  const showPurposeField     = type === "credit"
  // Bill Splitting: create-time only (the edit path deliberately strips
  // splits server-side), and only for outflow types where a shared bill
  // actually makes sense — Income splitting isn't built.
  //
  // Petty Cash is included: the backend never restricted splits by type, and
  // effectiveAmount() reads split_own_share regardless of type while
  // isExpenseBucket() already counts 'Petty Cash', so a petty-cash split
  // aggregates correctly everywhere. Splitting a small cash spend (auto
  // fare, snacks for the group) is one of the commonest real cases.
  const showSplitField       = !editTransaction
    && (type === "expense" || type === "credit" || type === "petty-cash")
    && txnKind === "purchase"

  // Refunds apply to any outflow you can get money back on; cashback is a
  // card reward, so it only makes sense on a credit card.
  const showKindField    = type === "expense" || type === "credit" || type === "petty-cash"
  const allowCashback    = type === "credit"
  const isRefund         = showKindField && txnKind === "refund"
  const isCashback       = showKindField && txnKind === "cashback"
  const isCredit         = isRefund || isCashback

  const selectedRefundable = refundables.find((r) => String(r.id) === refundForId) || null
  const refundRemaining = selectedRefundable
    ? selectedRefundable.amount - selectedRefundable.alreadyRefunded
    : null
  // A warning, never a block — shipping compensation and price protection
  // legitimately exceed the original purchase.
  const refundExceeds =
    refundRemaining !== null && Number(amount || 0) > refundRemaining + 0.005

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
        .sort((a, b) => a.card_name.localeCompare(b.card_name))
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

  // Auto-set due date to match transaction date for new expense transactions
  useEffect(() => {
    if (type === "expense" && !editTransaction) {
      setDueDate(date)
    }
  }, [date, type])

  // Cashback only exists on cards — switching away from a card transaction
  // must not leave an impossible kind selected.
  useEffect(() => {
    if (txnKind === "cashback" && !allowCashback) setTxnKind("purchase")
    if (!showKindField && txnKind !== "purchase") setTxnKind("purchase")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  // Load candidate purchases when the user starts logging a refund. Scoped to
  // the selected card when there is one, so the list stays short and can't
  // link a refund to a purchase on a different card.
  useEffect(() => {
    if (txnKind !== "refund") return
    setRefundablesLoading(true)
    // Scoped to the SAME transaction type the refund is being logged under —
    // a card purchase refunded through an Expense-type row would never
    // touch credit_card_payments, so the card's due wouldn't reflect money
    // that actually came back to it.
    const params: Record<string, string> = { transaction_type: toApiType(type) }
    if (type === "credit" && selectedCardId) params.card_id = selectedCardId
    apiClient(apiUrl("transaction/refundable", params))
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setRefundables(json.data || [])
      })
      .catch(() => setRefundables([]))
      .finally(() => setRefundablesLoading(false))
  }, [txnKind, type, selectedCardId])

  // Changing which purchase is being refunded invalidates the beneficiary,
  // who belongs to that specific purchase's split.
  useEffect(() => {
    setRefundBeneficiaryId("")
  }, [refundForId])

  // Inherit the original's category so the refund nets against the same line
  // rather than leaving a phantom "Shopping ₹2,000" in the breakdown. Also
  // inherit its Purpose (Expense/Investment/Asset) — Purpose decides which
  // P&L bucket a refund subtracts from, so leaving it on the "Expense"
  // default would silently reverse the wrong bucket for a refunded
  // Investment or Asset card purchase.
  useEffect(() => {
    if (selectedRefundable?.category) setCategory(selectedRefundable.category)
    if (selectedRefundable?.purpose) setPurpose(selectedRefundable.purpose)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refundForId])

  // Clear due date when switching away from expense type to avoid stale values
  useEffect(() => {
    if (type !== "expense") {
      setDueDate(undefined)
    }
  }, [type])

  const handleTypeChange = (val: string) => {
    const newType = val as TxType
    setType(newType)
    // Petty cash: always Paid
    if (newType === "petty-cash") setStatus("Paid")
    // If switching to credit, ensure cards loaded
    if (newType === "credit" && cards.length === 0) fetchCards()
  }

  // ── Bill Splitting helpers ──────────────────────────────────────────────
  const splitParticipantsValid = splitParticipants.filter(
    (p) => p.name.trim() && Number(p.amount) > 0,
  )
  const splitParticipantsTotal = splitParticipantsValid.reduce((s, p) => s + Number(p.amount), 0)
  const splitMyShare = Math.max(0, Number(amount || 0) - splitParticipantsTotal)
  const splitExceedsTotal = splitParticipantsTotal > Number(amount || 0)

  const updateSplitParticipant = (index: number, field: "name" | "amount", value: string) => {
    setSplitParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }
  const addSplitParticipant = () => setSplitParticipants((prev) => [...prev, { name: "", amount: "" }])
  const removeSplitParticipant = (index: number) =>
    setSplitParticipants((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const computeExpenseType = (): "fixed" | "variable" | null => {
    if (type === "expense")    return expenseType
    if (type === "credit")     return "variable"
    if (type === "petty-cash") return "fixed"
    if (type === "income")     return category === "Salary" ? "fixed" : "variable"
    if (type === "investment") return "variable"
    return null  // asset: no expense_type
  }

  const toApiType = (t: TxType) => {
    switch (t) {
      case "credit":     return "Credit Card"
      case "petty-cash": return "Petty Cash"
      case "investment": return "Investment"
      case "income":     return "Income"
      case "asset":      return "Asset"
      default:           return "Expense"
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
      if (type === "income" || type === "investment" || type === "petty-cash" || type === "asset") {
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
      body.purpose = purpose
    }

    // Refunds & Cashback. Amount always goes up positive — the backend
    // derives the sign from txn_kind, so nothing downstream has to guess.
    body.txn_kind = showKindField ? txnKind : "purchase"
    if (isRefund) {
      body.refund_for_id = refundForId ? Number(refundForId) : null
      body.refund_beneficiary_id = refundBeneficiaryId ? Number(refundBeneficiaryId) : null
    }

    if (showSplitField && splitEnabled && splitParticipantsValid.length > 0 && !splitExceedsTotal) {
      body.split = {
        participants: splitParticipantsValid.map((p) => ({
          person_name: p.name.trim(),
          amount: Number(p.amount),
        })),
      }
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
              { value: "asset",      label: "Asset Purchase" },
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
            searchPlaceholder="Search or type a new category…"
            emptyText="No matching category."
            onCreateOption={handleCreateCategory}
            createLabel={(v) => `Add "${v}" as a new category`}
            creating={creatingCategory}
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

        {/* Credit Card is a payment method, not a purpose — this says what
            the swipe was actually for, so a business purchase on a card
            doesn't silently count as personal spending. */}
        {showPurposeField && (
          <div className="space-y-1.5">
            <Label>Purpose</Label>
            <SearchableSelect
              value={purpose}
              onValueChange={(v) => setPurpose(v as "Expense" | "Investment" | "Asset")}
              placeholder="Select purpose"
              searchPlaceholder="Search purpose…"
              options={CREDIT_PURPOSES.map((p) => ({
                value: p,
                label: p,
                icon: <Layers className="h-4 w-4 text-muted-foreground" />,
              }))}
            />
          </div>
        )}
      </div>

      {/* Refunds & Cashback — money coming BACK. Both reduce the card bill;
          a refund also reverses the original expense, while cashback counts
          as income you earned. */}
      {showKindField && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Undo2 className="h-4 w-4 text-muted-foreground" />
            <Label>Entry type</Label>
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              { key: "purchase", label: "Purchase" },
              { key: "refund", label: "Refund" },
              ...(allowCashback ? [{ key: "cashback", label: "Cashback" }] : []),
            ] as const).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTxnKind(opt.key as typeof txnKind)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                  txnKind === opt.key
                    ? "border-primary bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {isCashback && (
            <p className="text-[11px] text-muted-foreground">
              Reduces this card&apos;s bill and counts as income. If the cycle has no spend yet, it carries
              forward as a credit against the next one.
            </p>
          )}

          {isRefund && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Refund for which purchase?
                </Label>
                <SearchableSelect
                  value={refundForId}
                  onValueChange={setRefundForId}
                  placeholder={refundablesLoading ? "Loading purchases…" : "Select the original purchase"}
                  searchPlaceholder="Search by description…"
                  options={refundables.map((r) => ({
                    value: String(r.id),
                    label: `${r.description} — ₹${r.amount.toLocaleString("en-IN")}${
                      r.alreadyRefunded > 0
                        ? ` (₹${r.alreadyRefunded.toLocaleString("en-IN")} already refunded)`
                        : ""
                    }${r.transactionDate ? ` · ${r.transactionDate}` : ""}`,
                  }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Optional — leave empty if the original purchase isn&apos;t tracked here.
                </p>
              </div>

              {refundRemaining !== null && (
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Not yet refunded</span>
                  <span className="font-semibold tnum">₹{refundRemaining.toLocaleString("en-IN")}</span>
                </div>
              )}

              {refundExceeds && (
                <p className="text-[11px] text-warning-text">
                  This is more than the outstanding amount on that purchase. That&apos;s fine if it includes
                  shipping or compensation — just confirming it&apos;s intentional.
                </p>
              )}

              {/* Split bills: a refund usually belongs to ONE person — the
                  returned item was theirs — so it should shrink THEIR
                  receivable, not your expense. */}
              {selectedRefundable && selectedRefundable.splitParticipants.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Whose share does this refund belong to?
                  </Label>
                  <SearchableSelect
                    value={refundBeneficiaryId}
                    onValueChange={setRefundBeneficiaryId}
                    placeholder="Mine — reduces my expense"
                    searchPlaceholder="Search people…"
                    options={[
                      { value: "", label: "Mine — reduces my expense" },
                      ...selectedRefundable.splitParticipants.map((p) => ({
                        value: String(p.id),
                        label: `${p.personName} — reduces what they owe me (₹${p.amount.toLocaleString("en-IN")})`,
                      })),
                    ]}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bill Splitting — one real payment, divided among the people it
          actually belongs to. Each participant's share becomes a receivable
          in the Borrowings & Lending ledger; whatever's left over is your
          own real Expense. Create-time only. */}
      {showSplitField && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label className="cursor-pointer" onClick={() => setSplitEnabled((v) => !v)}>
                Split this bill with others
              </Label>
            </div>
            <Switch checked={splitEnabled} onCheckedChange={setSplitEnabled} />
          </div>

          {splitEnabled && (
            <div className="space-y-3 pt-1">
              {splitParticipants.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Person's name"
                    value={p.name}
                    onChange={(e) => updateSplitParticipant(i, "name", e.target.value)}
                    className="flex-1"
                  />
                  <div className="relative w-32 shrink-0">
                    <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Amount"
                      inputMode="numeric"
                      value={p.amount}
                      onChange={(e) => updateSplitParticipant(i, "amount", e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSplitParticipant(i)}
                    disabled={splitParticipants.length === 1}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive-text hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addSplitParticipant} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add person
              </Button>

              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Your share</span>
                <span className="font-semibold tnum">
                  ₹{splitMyShare.toLocaleString("en-IN")}
                </span>
              </div>
              {splitExceedsTotal && (
                <p className="text-[11px] text-destructive-text">
                  Split amounts add up to more than the total bill amount.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={showSplitField && splitEnabled && splitExceedsTotal}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {editTransaction ? "Save Changes" : "Create"}
        </Button>
      </div>
    </form>
  )
}
