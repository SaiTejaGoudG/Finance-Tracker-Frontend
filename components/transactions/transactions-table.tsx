"use client"

/**
 * All Transactions table.
 *
 * Design notes:
 * - Rows are grouped by day with a subtotal in each group header, because the
 *   user's question is usually "what happened on the 21st", not "row 47".
 *   Each day header is a collapse toggle — closing one hides its rows so a
 *   long day list doesn't bury the days actually being compared.
 * - The header is sticky so column meaning survives a long scroll.
 * - Row actions are hover/focus-revealed (.row-reveal) rather than a permanent
 *   low-contrast "..." — the whole row is also clickable to view.
 * - Amounts use .tnum (tabular figures) and are right-aligned so digits line up.
 * - Synthetic EMI rows (id prefixed "emi_") are not real records, so they are
 *   excluded from selection and from edit/delete.
 */

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { ArrowDown, ArrowUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import StatusBadge from "@/components/status-badge"
import TransactionActions from "@/components/transaction-actions"
import { getCategoryMeta, getTypeColor, type TxType } from "@/lib/tx-meta"
import { getCardColor } from "@/lib/card-meta"
import { groupByDate } from "@/lib/group-transactions"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/app/transactions/page"
import type { Transaction as ActionTransaction } from "@/components/dashboard"
import type { Density } from "./transactions-toolbar"

const isSynthetic = (id: string) => id.startsWith("emi_")

/**
 * The row's TRUE type for display purposes — a Credit Card transaction is a
 * payment method, not a purpose, so a card swipe tagged purpose=Investment
 * (or Asset) should read as that, not as a generic "Credit Card" row. This
 * is what actually answers "is this Income/Expense/Investment?" at a glance;
 * without it, Credit Card and Investment rows even share the same info-blue
 * color, so they're impossible to tell apart from amount color alone.
 */
function getEffectiveTypeKey(t: Transaction): TxType {
  if (t.type === "credit" && (t.purpose === "Investment" || t.purpose === "Asset")) {
    return t.purpose === "Investment" ? "investment" : "asset"
  }
  return t.type as TxType
}

/**
 * app/transactions defines ownerType/expenseType as `T | null`, while the
 * shared dashboard Transaction type expects `T | undefined`. Normalise at this
 * one boundary rather than widening a type that 900+ lines depend on.
 */
function toActionTransaction(t: Transaction): ActionTransaction {
  return {
    ...t,
    ownerType: t.ownerType ?? undefined,
    expenseType: t.expenseType ?? undefined,
  }
}

function fmtINR(n: number) {
  return `₹${Math.abs(n).toLocaleString("en-IN")}`
}

function fmtDate(d?: string) {
  if (!d) return "—"
  try {
    return format(parseISO(d), "d MMM yyyy")
  } catch {
    return d
  }
}

// ─── Sortable column header ───────────────────────────────────────────────────

function SortHeader({
  label,
  active,
  order,
  onClick,
  className,
}: {
  label: string
  active: boolean
  order: "asc" | "desc"
  onClick: () => void
  className?: string
}) {
  const Icon = !active ? ChevronsUpDown : order === "asc" ? ArrowUp : ArrowDown
  return (
    <button
      onClick={onClick}
      className={cn(
        "group/sort inline-flex items-center gap-1 rounded text-xs font-medium uppercase tracking-wide transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <Icon
        className={cn(
          "h-3 w-3 transition-opacity",
          active ? "opacity-100" : "opacity-0 group-hover/sort:opacity-60",
        )}
        aria-hidden="true"
      />
    </button>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TransactionsTableProps {
  transactions: Transaction[]
  density: Density
  sortBy: "date" | "amount"
  sortOrder: "asc" | "desc"
  onToggleSort: (col: "date" | "amount") => void

  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void

  showDueDate?: boolean
  showCardColumn?: boolean
  showCardBadge?: boolean

  onView: (t: Transaction) => void
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export default function TransactionsTable({
  transactions,
  density,
  sortBy,
  sortOrder,
  onToggleSort,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  showDueDate,
  showCardColumn,
  showCardBadge,
  onView,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  // Which day groups are collapsed — closed groups keep their header (so they
  // can be reopened) but hide their rows. Empty set = everything expanded.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Grouping only makes sense while sorted by date; amount-sorted views stay flat
  const grouped = sortBy === "date"
  const groups = grouped
    ? groupByDate(transactions)
    : [
        {
          key: "all",
          label: "",
          weekday: "",
          items: transactions,
          net: 0,
          inflow: 0,
          outflow: 0,
        },
      ]

  const selectableIds = transactions.filter((t) => !isSynthetic(t.id)).map((t) => t.id)
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))
  const someSelected = selectableIds.some((id) => selectedIds.has(id))

  const rowPad = density === "compact" ? "py-2" : "py-3"
  const iconSize = density === "compact" ? "h-7 w-7 text-base" : "h-9 w-9 text-lg"

  // Column count for the group-header colspan
  const colCount =
    5 + (showDueDate ? 1 : 0) + (showCardColumn ? 1 : 0)

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full caption-bottom border-collapse text-sm">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-32" />
          {showDueDate && <col className="w-32" />}
          <col className="w-28" />
          <col className="w-36" />
          {showCardColumn && <col className="w-36" />}
          <col className="w-14" />
        </colgroup>

        <thead className="sticky-head">
          <tr>
            <th scope="col" className="px-4 py-2.5 text-left">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={onToggleSelectAll}
                aria-label="Select all transactions"
                disabled={selectableIds.length === 0}
              />
            </th>
            <th
              scope="col"
              className="px-2 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Transaction
            </th>
            <th scope="col" className="px-2 py-2.5 text-left">
              <SortHeader
                label="Date"
                active={sortBy === "date"}
                order={sortOrder}
                onClick={() => onToggleSort("date")}
              />
            </th>
            {showDueDate && (
              <th
                scope="col"
                className="px-2 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Due date
              </th>
            )}
            <th
              scope="col"
              className="px-2 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Status
            </th>
            <th scope="col" className="px-2 py-2.5 text-right">
              <SortHeader
                label="Amount"
                active={sortBy === "amount"}
                order={sortOrder}
                onClick={() => onToggleSort("amount")}
                className="justify-end"
              />
            </th>
            {showCardColumn && (
              <th
                scope="col"
                className="px-2 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Card
              </th>
            )}
            <th scope="col" className="px-4 py-2.5 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        {groups.map((group) => {
          const collapsed = grouped && collapsedGroups.has(group.key)

          return (
          <tbody key={group.key} className="divide-y divide-border">
            {/* Day header with subtotal — click/toggle to collapse this day */}
            {grouped && (
              <tr className="bg-muted/40">
                <td colSpan={colCount + 1} className="p-0">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={!collapsed}
                    className="flex w-full items-baseline justify-between gap-3 px-4 py-1.5 text-left transition-colors hover:bg-muted/70"
                  >
                    <span className="flex items-baseline gap-2">
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 self-center text-muted-foreground transition-transform",
                          collapsed && "-rotate-90",
                        )}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-foreground">
                        {group.label}
                      </span>
                      {group.weekday && (
                        <span className="text-xs text-muted-foreground">
                          {group.weekday}
                        </span>
                      )}
                      {collapsed && (
                        <span className="text-xs text-muted-foreground">
                          · {group.items.length}{" "}
                          {group.items.length === 1 ? "transaction" : "transactions"}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-3 text-xs">
                      {group.inflow > 0 && (
                        <span className="tnum text-success-text">
                          +{fmtINR(group.inflow)}
                        </span>
                      )}
                      {group.outflow > 0 && (
                        <span className="tnum text-muted-foreground">
                          −{fmtINR(group.outflow)}
                        </span>
                      )}
                      <span
                        className={cn(
                          "tnum font-semibold",
                          group.net >= 0 ? "text-success-text" : "text-foreground",
                        )}
                      >
                        {group.net >= 0 ? "+" : "−"}
                        {fmtINR(group.net)}
                      </span>
                    </span>
                  </button>
                </td>
              </tr>
            )}

            {!collapsed && group.items.map((t) => {
              const { emoji, color } = getCategoryMeta(t.category)
              const type = getTypeColor(t.type)
              const effectiveType = getTypeColor(getEffectiveTypeKey(t))
              const cardColor = getCardColor(t.cardName)
              const synthetic = isSynthetic(t.id)
              const selected = selectedIds.has(t.id)

              return (
                <tr
                  key={t.id}
                  onClick={() => onView(t)}
                  className={cn(
                    "group cursor-pointer transition-colors",
                    selected ? "bg-accent" : "hover:bg-muted/50",
                  )}
                >
                  {/* Select */}
                  <td className={cn("px-4", rowPad)} onClick={(e) => e.stopPropagation()}>
                    {!synthetic && (
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => onToggleSelect(t.id)}
                        aria-label={`Select ${t.description}`}
                      />
                    )}
                  </td>

                  {/* Description */}
                  <td className={cn("px-2", rowPad)}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "grid shrink-0 place-items-center rounded-xl select-none",
                          iconSize,
                        )}
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      >
                        {emoji}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {t.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs font-medium",
                              effectiveType.badgeClass,
                            )}
                          >
                            {effectiveType.label}
                          </span>
                          <span
                            className="inline-flex shrink-0 items-center truncate rounded-full px-1.5 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: `${color}26`, color }}
                          >
                            {t.category}
                          </span>
                          {t.splitOwnShare != null && (
                            <span
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                              title={`Split bill — your share: ₹${Math.round(t.splitOwnShare).toLocaleString("en-IN")}`}
                            >
                              Split · ₹{Math.round(t.splitOwnShare).toLocaleString("en-IN")}
                            </span>
                          )}
                          {/* Money coming BACK — visually distinct from a
                              spend so a refund can't be misread as another
                              purchase of the same thing. */}
                          {(t.txnKind === "refund" || t.txnKind === "cashback") && (
                            <span
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-subtle px-1.5 py-0.5 text-xs font-medium text-success-subtle-foreground"
                              title={
                                t.txnKind === "refund"
                                  ? "Refund — reverses the original purchase"
                                  : "Cashback — counts as income and reduces the card bill"
                              }
                            >
                              {t.txnKind === "refund" ? "↩ Refund" : "★ Cashback"}
                            </span>
                          )}
                          {showCardBadge && t.type === "credit" && t.cardName && (
                            <span
                              className={cn(
                                "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs",
                                !cardColor && type.badgeClass,
                              )}
                              style={
                                cardColor
                                  ? { backgroundColor: `${cardColor}26`, color: cardColor }
                                  : undefined
                              }
                            >
                              {t.cardName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td
                    className={cn(
                      "tnum whitespace-nowrap px-2 text-muted-foreground",
                      rowPad,
                    )}
                  >
                    {fmtDate(t.date)}
                  </td>

                  {/* Due date */}
                  {showDueDate && (
                    <td
                      className={cn(
                        "tnum whitespace-nowrap px-2 text-muted-foreground",
                        rowPad,
                      )}
                    >
                      {fmtDate(t.dueDate)}
                    </td>
                  )}

                  {/* Status */}
                  <td className={cn("px-2", rowPad)}>
                    <StatusBadge status={t.status || "Pending"} />
                  </td>

                  {/* Amount */}
                  <td className={cn("px-2 text-right", rowPad)}>
                    <span
                      className={cn(
                        "tnum whitespace-nowrap font-semibold",
                        effectiveType.amountText,
                      )}
                    >
                      {effectiveType.amountPrefix}
                      {fmtINR(t.amount)}
                    </span>
                  </td>

                  {/* Card */}
                  {showCardColumn && (
                    <td className={cn("px-2", rowPad)}>
                      {t.cardName ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                            !cardColor && "bg-muted text-muted-foreground",
                          )}
                          style={
                            cardColor
                              ? { backgroundColor: `${cardColor}26`, color: cardColor }
                              : undefined
                          }
                        >
                          {t.cardName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}

                  {/* Actions — revealed on row hover/focus */}
                  <td
                    className={cn("px-4 text-right", rowPad)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="row-reveal inline-flex">
                      <TransactionActions
                        transaction={toActionTransaction(t)}
                        onView={() => onView(t)}
                        onEdit={() => onEdit(t)}
                        onDelete={onDelete}
                        showEditOption={!synthetic}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          )
        })}
      </table>
    </div>
  )
}
