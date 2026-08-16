/**
 * tx-meta.ts — Emoji icons + hex colors for every transaction category/type.
 *
 * ⚠️  Colors use hex strings (not Tailwind classes) because Tailwind's JIT
 *     purges dynamically constructed class names. Use style={{ backgroundColor }}
 *     in components instead of className.
 */

// ─── Category metadata ────────────────────────────────────────────────────────

export interface CategoryMeta {
  emoji: string
  color: string  // hex background for the icon square
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  // ── Cross-type (offered under income, expense, investment and asset) ──────
  Airbnb:                 { emoji: "🏡", color: "#e11d48" }, // rose-600

  // ── Income ────────────────────────────────────────────────────────────────
  Salary:                 { emoji: "💼", color: "#3b82f6" }, // blue-500
  Freelancing:            { emoji: "💻", color: "#6366f1" }, // indigo-500
  Interest:               { emoji: "🐷", color: "#f472b6" }, // pink-400
  Others:                 { emoji: "💡", color: "#facc15" }, // yellow-400

  // ── Expense — food & lifestyle ─────────────────────────────────────────────
  Food:                   { emoji: "🍔", color: "#f97316" }, // orange-500
  Entertainment:          { emoji: "🎬", color: "#ec4899" }, // pink-500
  Shopping:               { emoji: "🛍️", color: "#06b6d4" }, // cyan-500
  "Personal Care":        { emoji: "✂️", color: "#fb7185" }, // rose-400
  Gardening:              { emoji: "🌿", color: "#22c55e" }, // green-500
  Gifts:                  { emoji: "🎁", color: "#f87171" }, // red-400
  Grocery:                { emoji: "🛒", color: "#16a34a" }, // green-600
  Party:                  { emoji: "🎉", color: "#d946ef" }, // fuchsia-500
  Watch:                  { emoji: "⌚", color: "#374151" }, // gray-700
  Desktop:              { emoji: "🖥️", color: "#1d4ed8" }, // blue-700
  Dining:               { emoji: "🍽️", color: "#b45309" }, // amber-700
  "Snacks & Beverages": { emoji: "🧃", color: "#65a30d" }, // lime-600
  "Street Food":        { emoji: "🌮", color: "#ea580c" }, // orange-600

  // ── Expense — transport & vehicles ────────────────────────────────────────
  Transport:              { emoji: "🚇", color: "#a855f7" }, // purple-500
  Travel:                 { emoji: "✈️", color: "#0ea5e9" }, // sky-500
  "Bike Fuel":            { emoji: "🏍️", color: "#fb7185" }, // rose-400
  "Bike Service":         { emoji: "🔧", color: "#64748b" }, // slate-500
  "Car Fuel":             { emoji: "⛽", color: "#f87171" }, // red-400
  "Car Service":          { emoji: "🔧", color: "#6b7280" }, // gray-500
  "Car Accessories":      { emoji: "🚗", color: "#9ca3af" }, // gray-400

  // ── Expense — home & utilities ────────────────────────────────────────────
  Housing:                { emoji: "🏠", color: "#14b8a6" }, // teal-500
  Utilities:              { emoji: "⚡", color: "#f59e0b" }, // amber-500

  // ── Expense — finance ─────────────────────────────────────────────────────
  EMI:                    { emoji: "🧾", color: "#64748b" }, // slate-500
  Debt:                   { emoji: "💸", color: "#dc2626" }, // red-600
  Chitti:                 { emoji: "🏦", color: "#d97706" }, // amber-600
  "Credit Card Payment":  { emoji: "💳", color: "#7c3aed" }, // violet-600
  "Credit Card":          { emoji: "💳", color: "#7c3aed" }, // alias
  "Credit Cards":         { emoji: "💳", color: "#7c3aed" }, // alias
  "Other Expenses":       { emoji: "💡", color: "#facc15" }, // yellow-400

  // ── Expense — personal development ────────────────────────────────────────
  Education:              { emoji: "📚", color: "#2563eb" }, // blue-600
  Healthcare:             { emoji: "💊", color: "#ef4444" }, // red-500
  Electronics:            { emoji: "📱", color: "#475569" }, // slate-600
  Gadgets:                { emoji: "🖥️", color: "#64748b" }, // slate-500

  // ── Investment ────────────────────────────────────────────────────────────
  SIP:                    { emoji: "📈", color: "#3b82f6" }, // blue-500

  // ── Asset (physical) ─────────────────────────────────────────────────────
  Land:                   { emoji: "🏞️", color: "#15803d" }, // green-700
  "Property / Flat":      { emoji: "🏠", color: "#0369a1" }, // sky-700
  "Physical Gold":        { emoji: "🥇", color: "#d97706" }, // amber-600
  Vehicle:                { emoji: "🚗", color: "#6d28d9" }, // violet-700
  Equipment:              { emoji: "⚙️", color: "#475569" }, // slate-600
  "Other Asset":          { emoji: "💎", color: "#be185d" }, // pink-700
}

const DEFAULT_META: CategoryMeta = { emoji: "💰", color: "#9ca3af" } // gray-400

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? DEFAULT_META
}

// ─── Transaction type metadata ────────────────────────────────────────────────

export type TxType =
  | "income"
  | "expense"
  | "credit"
  | "petty-cash"
  | "investment"
  | "asset"
  | "summary"
  // Borrowings & Lending — balance-sheet movements (a receivable/payable
  // changing hands), never Income/Expense/Investment. See the "lending"
  // module for why: giving money away isn't a cost, getting it back isn't
  // earnings, same in reverse for borrowing.
  | "lending"
  | "lending-repayment"
  | "borrowing"
  | "borrowing-repayment"

export interface TypeColor {
  emoji: string
  /** hex background for the summary card icon square */
  iconColor: string
  /**
   * Tailwind text-color class for the amount.
   * Uses semantic tokens (see app/globals.css) so it inverts in dark mode —
   * the previous text-green-600 / text-red-600 literals did not.
   */
  amountText: string
  /** Subtle pill fill + text pair, for type badges */
  badgeClass: string
  /** Chart/series token for this type */
  chartVar: string
  amountPrefix: string
  label: string
}

export const TYPE_COLORS: Record<TxType, TypeColor> = {
  income: {
    emoji:        "💰",
    iconColor:    "#22c55e", // green-500
    amountText:   "text-success-text",
    badgeClass:   "bg-success-subtle text-success-subtle-foreground",
    chartVar:     "hsl(var(--chart-3))",
    amountPrefix: "+",
    label:        "Income",
  },
  expense: {
    emoji:        "💸",
    iconColor:    "#ef4444", // red-500
    amountText:   "text-destructive-text",
    badgeClass:   "bg-destructive-subtle text-destructive-subtle-foreground",
    chartVar:     "hsl(var(--chart-4))",
    amountPrefix: "−",
    label:        "Expense",
  },
  credit: {
    emoji:        "💳",
    iconColor:    "#8b5cf6", // violet-500
    amountText:   "text-info-text",
    badgeClass:   "bg-info-subtle text-info-subtle-foreground",
    chartVar:     "hsl(var(--chart-6))",
    amountPrefix: "−",
    label:        "Credit Card",
  },
  "petty-cash": {
    emoji:        "🪙",
    iconColor:    "#f97316", // orange-500
    amountText:   "text-warning-text",
    badgeClass:   "bg-warning-subtle text-warning-subtle-foreground",
    chartVar:     "hsl(var(--chart-2))",
    amountPrefix: "−",
    label:        "Petty Cash",
  },
  investment: {
    emoji:        "📈",
    iconColor:    "#3b82f6", // blue-500
    amountText:   "text-info-text",
    badgeClass:   "bg-info-subtle text-info-subtle-foreground",
    chartVar:     "hsl(var(--chart-5))",
    amountPrefix: "↑",
    label:        "Investment",
  },
  asset: {
    emoji:        "🏛️",
    iconColor:    "#0d9488", // teal-600
    amountText:   "text-foreground",
    badgeClass:   "bg-secondary text-secondary-foreground",
    chartVar:     "hsl(var(--chart-1))",
    amountPrefix: "",
    label:        "Asset",
  },
  lending: {
    emoji:        "🤝",
    iconColor:    "#64748b", // slate-500 — deliberately neutral, not destructive-red: this isn't a real expense
    amountText:   "text-muted-foreground",
    badgeClass:   "bg-muted text-muted-foreground",
    chartVar:     "hsl(var(--chart-1))",
    amountPrefix: "−",
    label:        "Lending",
  },
  "lending-repayment": {
    emoji:        "🤝",
    iconColor:    "#3b82f6", // blue-500
    amountText:   "text-info-text",
    badgeClass:   "bg-info-subtle text-info-subtle-foreground",
    chartVar:     "hsl(var(--chart-5))",
    amountPrefix: "+",
    label:        "Lending Repayment",
  },
  borrowing: {
    emoji:        "🙏",
    iconColor:    "#f59e0b", // amber-500 — a liability, not income, even though cash is coming in
    amountText:   "text-warning-text",
    badgeClass:   "bg-warning-subtle text-warning-subtle-foreground",
    chartVar:     "hsl(var(--chart-2))",
    amountPrefix: "+",
    label:        "Borrowing",
  },
  "borrowing-repayment": {
    emoji:        "🙏",
    iconColor:    "#64748b", // slate-500 — neutral, not a real expense
    amountText:   "text-muted-foreground",
    badgeClass:   "bg-muted text-muted-foreground",
    chartVar:     "hsl(var(--chart-1))",
    amountPrefix: "−",
    label:        "Borrowing Repayment",
  },
  summary: {
    emoji:        "📊",
    iconColor:    "#9ca3af", // gray-400
    amountText:   "text-foreground",
    badgeClass:   "bg-muted text-muted-foreground",
    chartVar:     "hsl(var(--muted-foreground))",
    amountPrefix: "",
    label:        "Summary",
  },
}

export function getTypeColor(type: string): TypeColor {
  return TYPE_COLORS[type as TxType] ?? TYPE_COLORS.expense
}
