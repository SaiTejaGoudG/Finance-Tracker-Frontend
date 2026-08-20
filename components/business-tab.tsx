"use client"

/**
 * Business Ledgers — track a side venture (e.g. an Airbnb rental) as its own
 * slice of your finances: total invested, total income, total expense, net
 * profit, month-wise. A ledger is just a name plus a list of category
 * strings; the backend matches transactions.category (case-insensitively)
 * against that list regardless of transaction_type, so a capital purchase
 * made on a credit card (purpose=Investment) counts the same as one paid
 * from a bank account. See businessLedgersService.js for the full picture.
 *
 * Deliberately generic rather than hardcoding "Airbnb" — same reasoning as
 * the removed global "Airbnb" default category: one person's venture
 * shouldn't be baked in, it should be something anyone can define for
 * themselves, and reused for a second venture later if they start one.
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import {
  Plus,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { EmptyState } from "@/components/ui/states"
import { toast } from "@/hooks/use-toast"
import { useAllCustomCategories } from "@/hooks/use-categories"
import type { DateRange } from "react-day-picker"
import { DateRangeFilter } from "@/components/transactions/transactions-toolbar"
import { getCategoryMeta, getTypeColor } from "@/lib/tx-meta"
import { getCardColor } from "@/lib/card-meta"
import { groupByDate } from "@/lib/group-transactions"
import StatusBadge from "@/components/status-badge"
import TransactionForm from "@/components/transaction-form"
import {
  incomeCategories,
  expenseCategories,
  investmentCategories,
  assetCategories,
  creditCategories,
} from "@/lib/data"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ledger {
  id: number
  name: string
  categories: string[]
}

interface MonthRow {
  month: string
  income: number
  expense: number
  investment: number
  asset: number
  net: number
}

interface LedgerTxnRow {
  id: number
  description: string
  category: string
  /** P&L bucket the row was counted under — NOT the raw transaction_type. */
  type: "income" | "expense" | "investment" | "asset"
  cardName: string | null
  date: string
  status: "Pending" | "Paid" | "Overdue"
  /** Signed effective amount, used for display and day subtotals. */
  amount: number
  txnKind: "purchase" | "refund" | "cashback"
  // Passthrough fields, only used to prefill the edit form.
  transactionType?: string
  purpose?: "Expense" | "Investment" | "Asset" | null
  cardId?: number | null
  dueDate?: string | null
  ownerType?: string | null
  expenseType?: "fixed" | "variable" | null
  /** Raw stored amount — what the user originally typed. */
  rawAmount?: number
}

/** Form's TxType keys. */
type EditableTxType = "income" | "expense" | "credit" | "petty-cash" | "investment" | "asset"

/**
 * transaction_type -> the transaction form's own type key. Has to go through
 * the RAW type, not the P&L bucket: a Credit Card charge with
 * purpose=Investment buckets as "investment" but must reopen as a Credit
 * Card row, or saving it would silently convert it into a bank-funded
 * investment and drop it off the card's bill.
 */
const FORM_TYPE_BY_TXN_TYPE: Record<string, EditableTxType> = {
  Income: "income",
  Expense: "expense",
  "Credit Card": "credit",
  "Petty Cash": "petty-cash",
  Investment: "investment",
  Asset: "asset",
}

function toEditTransaction(row: LedgerTxnRow) {
  const formType: EditableTxType =
    (row.transactionType && FORM_TYPE_BY_TXN_TYPE[row.transactionType]) || row.type
  return {
    id: String(row.id),
    description: row.description,
    amount: Math.abs(row.rawAmount ?? row.amount),
    type: formType,
    category: row.category,
    date: row.date,
    dueDate: row.dueDate || undefined,
    status: row.status === "Paid" ? ("Paid" as const) : ("Pending" as const),
    cardName: row.cardName || undefined,
    ownerType: row.ownerType ?? null,
    expenseType: row.expenseType ?? null,
    purpose: row.purpose ?? null,
  }
}

interface LedgerSummary {
  ledger: Ledger
  totals: { income: number; expense: number; investment: number; asset: number; netProfit: number }
  monthly: MonthRow[]
  transactions: LedgerTxnRow[]
  transactionCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (n: number) => "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN")
const fmtY = (v: number) =>
  Math.abs(v) >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : Math.abs(v) >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`
const fmtMonth = (m: string) => {
  try {
    return format(parseISO(`${m}-01`), "MMM yyyy")
  } catch {
    return m
  }
}
const fmtShortDate = (d: string) => {
  try {
    return format(parseISO(d), "d MMM yyyy")
  } catch {
    return d
  }
}

function transformLedger(raw: any): Ledger {
  return {
    id: raw.id,
    name: raw.name,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
  }
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function SummaryTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-semibold">{fmtMonth(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="capitalize text-muted-foreground">{p.dataKey}</span>
          <span className="font-medium tabular-nums">{fmtINR(p.value as number)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Category tag input ───────────────────────────────────────────────────────

function CategoryTagInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[]
  onChange: (next: string[]) => void
  suggestions: string[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const isSelected = (name: string) => value.some((v) => v.toLowerCase() === name.toLowerCase())

  const toggle = (name: string) => {
    if (isSelected(name)) {
      onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()))
    } else {
      onChange([...value, name])
    }
  }

  const trimmedSearch = search.trim()
  const canCreate =
    trimmedSearch.length > 0 &&
    !suggestions.some((s) => s.toLowerCase() === trimmedSearch.toLowerCase()) &&
    !isSelected(trimmedSearch)

  const handleCreate = () => {
    if (!trimmedSearch) return
    onChange([...value, trimmedSearch])
    setSearch("")
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-full border bg-card py-1 pl-2.5 pr-1 text-xs"
          >
            {c}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== c))}
              aria-label={`Remove ${c}`}
              className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:bg-destructive-subtle hover:text-destructive-text"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add a category
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <Command>
            <CommandInput
              placeholder="Search or type a new category…"
              value={search}
              onValueChange={setSearch}
              autoFocus
            />
            <CommandList className="max-h-56 overflow-y-auto overscroll-contain">
              <CommandEmpty>No matches — add it as a new category below.</CommandEmpty>
              <CommandGroup>
                {suggestions.map((s) => {
                  const selected = isSelected(s)
                  return (
                    <CommandItem
                      key={s}
                      value={s}
                      onSelect={() => toggle(s)}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Check className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                      <span>{s}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-1">
              <button
                type="button"
                onClick={canCreate ? handleCreate : undefined}
                disabled={!canCreate}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                  canCreate ? "text-foreground hover:bg-accent" : "cursor-default text-muted-foreground",
                )}
              >
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {canCreate ? `Add "${trimmedSearch}"` : "Type a name above to add a new one"}
                </span>
              </button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      <p className="text-xs text-muted-foreground">
        Every transaction using one of these category names counts toward this business — across
        any transaction type (Income, Expense, Investment, or a Credit Card purchase tagged with
        that purpose).
      </p>
    </div>
  )
}

// ─── Ledger form dialog (create + edit) ──────────────────────────────────────

function LedgerFormDialog({
  open,
  onOpenChange,
  initial,
  suggestions,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Ledger
  suggestions: string[]
  onSaved: (ledger: Ledger) => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [categories, setCategories] = useState<string[]>(initial?.categories ?? [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setCategories(initial?.categories ?? [])
    }
  }, [open, initial])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      const isEdit = !!initial
      const res = await apiClient(
        apiUrl(isEdit ? `business-ledgers/${initial!.id}` : "business-ledgers"),
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed, categories }),
        },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.status === "error") {
        throw new Error(json?.message || "Failed to save business")
      }
      onSaved(transformLedger(json.data))
      onOpenChange(false)
      toast({ title: isEdit ? "Business updated" : "Business created" })
    } catch (e) {
      toast({
        title: "Couldn't save",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit business" : "New business"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="business-name">Name</Label>
            <Input
              id="business-name"
              placeholder="e.g. Airbnb"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Categories</Label>
            <CategoryTagInput value={categories} onChange={setCategories} suggestions={suggestions} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Summary tile ─────────────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ElementType
  tone: "neutral" | "success" | "destructive"
}) {
  const toneClass =
    tone === "success"
      ? "text-success-text"
      : tone === "destructive"
        ? "text-destructive-text"
        : "text-foreground"
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", toneClass)}>
        {value < 0 ? "−" : ""}
        {fmtINR(value)}
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BusinessTab() {
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
  const [loadingLedgers, setLoadingLedgers] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingLedger, setEditingLedger] = useState<Ledger | undefined>(undefined)
  const [deleting, setDeleting] = useState(false)
  const [txnFormOpen, setTxnFormOpen] = useState(false)
  const [editingTxn, setEditingTxn] = useState<LedgerTxnRow | null>(null)
  const [txnTypeTab, setTxnTypeTab] = useState<"all" | "income" | "investment" | "expense">("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const { custom: customCategories } = useAllCustomCategories()

  const categorySuggestions = useMemo(() => {
    const all = [
      ...incomeCategories,
      ...expenseCategories,
      ...investmentCategories,
      ...assetCategories,
      ...creditCategories,
      ...customCategories.map((c) => c.name),
    ]
    const seen = new Set<string>()
    const deduped: string[] = []
    for (const c of all) {
      const key = c.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(c)
    }
    return deduped.sort((a, b) => a.localeCompare(b))
  }, [customCategories])

  // Transactions scoped to the active All/Income/Invested/Expense tab.
  const filteredTransactions = useMemo(() => {
    if (!summary?.transactions?.length) return []
    if (txnTypeTab === "all") return summary.transactions
    return summary.transactions.filter((t) => t.type === txnTypeTab)
  }, [summary, txnTypeTab])

  // groupByDate requires a string id — the ledger rows come back from the
  // API with numeric ids, so map them rather than widen the shared type.
  // `source` carries the untouched row through so a row click still has the
  // real numeric id (and every edit-form field) to work with.
  const ledgerGroups = useMemo(() => {
    if (!filteredTransactions.length) return []
    return groupByDate(
      filteredTransactions.map((t) => ({ ...t, id: String(t.id), source: t })),
    )
  }, [filteredTransactions])

  const fetchLedgers = useCallback(async () => {
    setLoadingLedgers(true)
    try {
      const res = await apiClient(apiUrl("business-ledgers"))
      const json = await res.json().catch(() => ({}))
      const rows: Ledger[] = Array.isArray(json.data) ? json.data.map(transformLedger) : []
      setLedgers(rows)
      setSelectedId((prev) => prev ?? rows[0]?.id ?? null)
    } catch {
      // Best-effort — EmptyState covers the no-data case regardless.
    } finally {
      setLoadingLedgers(false)
    }
  }, [])

  useEffect(() => {
    fetchLedgers()
  }, [fetchLedgers])

  const fetchSummary = useCallback(async (id: number, range?: DateRange) => {
    setLoadingSummary(true)
    try {
      // The backend filters by transaction_date, so the totals, the chart and
      // the list all narrow together — no client-side re-slicing needed.
      const params: Record<string, string> = {}
      if (range?.from && range?.to) {
        params.start_date = format(range.from, "yyyy-MM-dd")
        params.end_date = format(range.to, "yyyy-MM-dd")
      }
      const res = await apiClient(apiUrl(`business-ledgers/${id}/summary`, params))
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.status === "success") {
        setSummary(json.data)
      } else {
        setSummary(null)
      }
    } catch {
      setSummary(null)
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId != null) {
      fetchSummary(selectedId, dateRange)
    } else {
      setSummary(null)
    }
    // Switching businesses shouldn't carry over a filter that might not
    // apply / might silently show an empty list for the new ledger.
    setTxnTypeTab("all")
  }, [selectedId, dateRange, fetchSummary])

  const selectedLedger = ledgers.find((l) => l.id === selectedId)

  const handleSaved = (ledger: Ledger) => {
    setLedgers((prev) => {
      const exists = prev.some((l) => l.id === ledger.id)
      return exists ? prev.map((l) => (l.id === ledger.id ? ledger : l)) : [...prev, ledger]
    })
    setSelectedId(ledger.id)
    fetchSummary(ledger.id, dateRange)
  }

  const handleDelete = async () => {
    if (!selectedLedger) return
    setDeleting(true)
    try {
      const res = await apiClient(apiUrl(`business-ledgers/${selectedLedger.id}`), { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.status === "error") {
        throw new Error(json?.message || "Failed to delete business")
      }
      const remaining = ledgers.filter((l) => l.id !== selectedLedger.id)
      setLedgers(remaining)
      setSelectedId(remaining[0]?.id ?? null)
      toast({ title: "Business deleted", description: "Its transactions are untouched." })
    } catch (e) {
      toast({
        title: "Couldn't delete",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loadingLedgers) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted" />
  }

  return (
    <div className="space-y-5">
      {/* Ledger picker */}
      <div className="flex flex-wrap items-center gap-2">
        {ledgers.length > 0 && (
          <Select
            value={selectedId != null ? String(selectedId) : undefined}
            onValueChange={(v) => setSelectedId(Number(v))}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Choose a business" />
            </SelectTrigger>
            <SelectContent>
              {ledgers.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant={ledgers.length > 0 ? "outline" : "default"}
          onClick={() => {
            setEditingLedger(undefined)
            setFormOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New business
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            setEditingTxn(null)
            setTxnFormOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add transaction
        </Button>

        {selectedLedger && (
          <DateRangeFilter range={dateRange} onRangeChange={setDateRange} disabled={loadingSummary} />
        )}

        {selectedLedger && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit business"
              onClick={() => {
                setEditingLedger(selectedLedger)
                setFormOpen(true)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Delete business">
                  <Trash2 className="h-4 w-4 text-destructive-text" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{selectedLedger.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This only removes the saved category grouping — none of the underlying
                    transactions are touched or deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      {ledgers.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No business set up yet"
          description="Track a side venture — an Airbnb rental, a small shop, freelancing — by grouping the categories you log transactions under. Total invested, total income, net profit, month-wise, all in one place."
        />
      ) : selectedLedger && selectedLedger.categories.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No categories added yet"
          description={`Edit "${selectedLedger.name}" and add at least one category to start seeing numbers here.`}
        />
      ) : loadingSummary ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : summary && summary.transactionCount === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No transactions yet"
          description="Nothing logged under these categories yet — add a transaction with a matching category and it'll show up here."
        />
      ) : summary ? (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Total Invested" value={summary.totals.investment} icon={Wallet} tone="neutral" />
            <SummaryTile label="Total Income" value={summary.totals.income} icon={TrendingUp} tone="success" />
            <SummaryTile label="Total Expense" value={summary.totals.expense} icon={TrendingDown} tone="destructive" />
            <SummaryTile
              label="Net Profit"
              value={summary.totals.netProfit}
              icon={PiggyBank}
              tone={summary.totals.netProfit >= 0 ? "success" : "destructive"}
            />
          </div>

          {/* Month-wise chart */}
          {summary.monthly.length > 0 && (
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Month by month</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={fmtMonth}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={fmtY}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip content={<SummaryTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Income" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="investment" name="Invested" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Date-wise transaction list — every transaction matching this
              ledger's categories, all-time, grouped by day like All
              Transactions (see components/transactions/transactions-table.tsx
              for the pattern this mirrors). All/Income/Invested/Expense tabs
              filter summary.transactions client-side before grouping. */}
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <Tabs value={txnTypeTab} onValueChange={(v) => setTxnTypeTab(v as typeof txnTypeTab)}>
              <div className="border-b px-4 py-2">
                <TabsList className="h-auto w-fit justify-start gap-1 rounded-none bg-transparent p-0">
                  {(
                    [
                      ["all", "All Transactions"],
                      ["income", "Income"],
                      ["investment", "Invested"],
                      ["expense", "Expense"],
                    ] as const
                  ).map(([value, label]) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={cn(
                        "relative rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground shadow-none transition-colors",
                        "hover:text-foreground",
                        "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
                      )}
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value={txnTypeTab} className="m-0">
                {ledgerGroups.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No {txnTypeTab === "all" ? "" : `${txnTypeTab} `}transactions to show here.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      {ledgerGroups.map((group) => (
                  <tbody key={group.key} className="divide-y divide-border">
                    <tr className="bg-muted/40">
                      <td colSpan={4} className="px-4 py-1.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="flex items-baseline gap-2">
                            <span className="text-xs font-medium text-foreground">{group.label}</span>
                            {group.weekday && (
                              <span className="text-xs text-muted-foreground">{group.weekday}</span>
                            )}
                          </span>
                          <span
                            className={cn(
                              "tnum text-xs font-semibold",
                              group.net >= 0 ? "text-success-text" : "text-foreground",
                            )}
                          >
                            {group.net >= 0 ? "+" : "−"}
                            {fmtINR(group.net)}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {group.items.map((item) => {
                      const { emoji, color } = getCategoryMeta(item.category)
                      const type = getTypeColor(item.type)
                      const cardColor = getCardColor(item.cardName)

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setEditingTxn(item.source)
                            setTxnFormOpen(true)
                          }}
                          title="Click to edit this transaction"
                          className="cursor-pointer transition-colors hover:bg-muted/50"
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-base select-none"
                                style={{ backgroundColor: color }}
                                aria-hidden="true"
                              >
                                {emoji}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">{item.description}</p>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs font-medium",
                                      type.badgeClass,
                                    )}
                                  >
                                    {type.label}
                                  </span>
                                  {/* No category pill here — this list is already scoped to
                                      the selected business's own categories via the ledger
                                      dropdown above, so repeating it on every row is just
                                      noise (unlike All Transactions, which spans every
                                      category and needs it). */}
                                  {(item.txnKind === "refund" || item.txnKind === "cashback") && (
                                    <span
                                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-subtle px-1.5 py-0.5 text-xs font-medium text-success-subtle-foreground"
                                      title={
                                        item.txnKind === "refund"
                                          ? "Refund — reverses the original purchase"
                                          : "Cashback — counts as income"
                                      }
                                    >
                                      {item.txnKind === "refund" ? "↩ Refund" : "★ Cashback"}
                                    </span>
                                  )}
                                  {item.cardName && (
                                    <span
                                      className={cn(
                                        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs",
                                        !cardColor && "bg-muted text-muted-foreground",
                                      )}
                                      style={
                                        cardColor
                                          ? { backgroundColor: `${cardColor}26`, color: cardColor }
                                          : undefined
                                      }
                                    >
                                      {item.cardName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-muted-foreground">
                            {fmtShortDate(item.date)}
                          </td>
                          <td className="px-2 py-2.5">
                            <StatusBadge status={item.status || "Pending"} />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={cn("tnum whitespace-nowrap font-semibold", type.amountText)}>
                              {type.amountPrefix}
                              {fmtINR(item.amount)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                ))}
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : null}

      <LedgerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editingLedger}
        suggestions={categorySuggestions}
        onSaved={handleSaved}
      />

      {/* TransactionForm does its own create/update API call — this just
          closes the dialog and refreshes whichever ledger is selected, since
          the row may have moved in or out of its categories. Shared by the
          "Add transaction" button and row clicks; editingTxn decides which. */}
      <Dialog
        open={txnFormOpen}
        onOpenChange={(open) => {
          setTxnFormOpen(open)
          if (!open) setEditingTxn(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTxn ? "Edit transaction" : "Add transaction"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            editTransaction={editingTxn ? toEditTransaction(editingTxn) : null}
            onSubmit={async () => {
              const wasEdit = Boolean(editingTxn)
              setTxnFormOpen(false)
              setEditingTxn(null)
              toast({ title: wasEdit ? "Transaction updated" : "Transaction added" })
              if (selectedId != null) fetchSummary(selectedId, dateRange)
            }}
            onCancel={() => {
              setTxnFormOpen(false)
              setEditingTxn(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
