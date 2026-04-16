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
  Party:                  { emoji: "🎉", color: "#d946ef" }, // fuchsia-500

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
}

const DEFAULT_META: CategoryMeta = { emoji: "💰", color: "#9ca3af" } // gray-400

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? DEFAULT_META
}

// ─── Transaction type metadata ────────────────────────────────────────────────

export type TxType = "income" | "expense" | "credit" | "petty-cash" | "investment" | "summary"

export interface TypeColor {
  emoji: string
  /** hex background for the summary card icon square */
  iconColor: string
  /** Tailwind text-color class for the amount (safe: hardcoded in component) */
  amountText: string
  amountPrefix: string
  label: string
}

export const TYPE_COLORS: Record<TxType, TypeColor> = {
  income: {
    emoji:        "💰",
    iconColor:    "#22c55e", // green-500
    amountText:   "text-green-600",
    amountPrefix: "+",
    label:        "Income",
  },
  expense: {
    emoji:        "💸",
    iconColor:    "#ef4444", // red-500
    amountText:   "text-red-600",
    amountPrefix: "−",
    label:        "Expense",
  },
  credit: {
    emoji:        "💳",
    iconColor:    "#8b5cf6", // violet-500
    amountText:   "text-violet-600",
    amountPrefix: "−",
    label:        "Credit Card",
  },
  "petty-cash": {
    emoji:        "🪙",
    iconColor:    "#f97316", // orange-500
    amountText:   "text-orange-600",
    amountPrefix: "−",
    label:        "Petty Cash",
  },
  investment: {
    emoji:        "📈",
    iconColor:    "#3b82f6", // blue-500
    amountText:   "text-blue-600",
    amountPrefix: "↑",
    label:        "Investment",
  },
  summary: {
    emoji:        "📊",
    iconColor:    "#9ca3af", // gray-400
    amountText:   "text-gray-700",
    amountPrefix: "",
    label:        "Summary",
  },
}

export function getTypeColor(type: string): TypeColor {
  return TYPE_COLORS[type as TxType] ?? TYPE_COLORS.expense
}
