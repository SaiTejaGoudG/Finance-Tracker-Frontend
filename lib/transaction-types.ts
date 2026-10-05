/**
 * The canonical Transaction shape, and the narrower shape the edit form accepts.
 *
 * These used to be declared twice — once in components/dashboard.tsx and once
 * in app/transactions/page.tsx — describing the same domain object with
 * subtly different types:
 *
 *   dashboard.tsx        ownerType?: string           expenseType?: string
 *   transactions/page    ownerType?: string | null    expenseType?: "fixed" | "variable" | null
 *
 * Passing a row from one to the other therefore failed to type-check, and the
 * workaround was a `toActionTransaction()` normaliser at one boundary plus
 * `ignoreBuildErrors: true` masking the rest. Both files now re-export from
 * here, so there is one definition and the boundary conversions disappear.
 *
 * Where the two disagreed, the stricter version wins: `owner_type` and
 * `expense_type` really are nullable in the API, and `expense_type` really is
 * a two-value enum, so the loose `string` was hiding information rather than
 * being more permissive.
 */

// ─── Type unions ──────────────────────────────────────────────────────────────

/**
 * Every type a row can DISPLAY as, including ones that aren't real editable
 * transactions: `summary` is a synthetic aggregate row, and the
 * lending/borrowing family are balance-sheet movements owned by the
 * Borrowings & Lending module rather than the transaction form.
 */
export type TransactionType =
  | "income"
  | "expense"
  | "credit"
  | "petty-cash"
  | "investment"
  | "asset"
  | "summary"
  | "lending"
  | "lending-repayment"
  | "borrowing"
  | "borrowing-repayment"

/**
 * The subset the transaction form can actually create or edit.
 *
 * This is the distinction the old code lost: `Transaction["type"]` was being
 * assigned straight into the form's `editTransaction` prop, which meant
 * nothing stopped a synthetic summary row or a lending entry from being
 * handed to a form that has no way to represent it. `toEditTransaction()`
 * below makes that impossible instead of merely unlikely.
 */
export type EditableTxType =
  | "income"
  | "expense"
  | "credit"
  | "petty-cash"
  | "investment"
  | "asset"

export type TransactionStatus = "Pending" | "Paid"

const EDITABLE_TX_TYPES: readonly EditableTxType[] = [
  "income",
  "expense",
  "credit",
  "petty-cash",
  "investment",
  "asset",
]

// ─── Shapes ───────────────────────────────────────────────────────────────────

export type Transaction = {
  id: string
  description: string
  amount: number
  type: TransactionType
  category: string
  date: string
  dueDate?: string
  status?: TransactionStatus
  cardName?: string
  ownerType?: string | null
  expenseType?: "fixed" | "variable" | null
  /**
   * Credit Card is a payment method, not a purpose — a card swipe can be an
   * ordinary Expense, an Investment or an Asset purchase.
   */
  purpose?: "Expense" | "Investment" | "Asset" | null
  /** True for synthetic aggregate rows (e.g. a rolled-up card bill). */
  isSummary?: boolean
  summaryType?: "credit" | "petty-cash" | "investment"
  /** Credit card payment row this transaction settles, if any. */
  payment_id?: number
  /** Bill Splitting — only your share of `amount`; null if not split. */
  splitOwnShare?: number | null
  /** Refunds & Cashback — a credit back to the account, not a spend. */
  txnKind?: "purchase" | "refund" | "cashback" | null
  refundForId?: number | null
}

/** What components/transaction-form.tsx accepts to prefill an edit. */
export type EditTransaction = {
  id: string
  description: string
  amount: number
  type: EditableTxType
  category: string
  /** ISO yyyy-mm-dd */
  date: string
  dueDate?: string
  status?: TransactionStatus
  cardName?: string
  ownerType?: string | null
  expenseType?: "fixed" | "variable" | null
  purpose?: "Expense" | "Investment" | "Asset" | null
}

// ─── Narrowing ────────────────────────────────────────────────────────────────

/** True if this row is something the transaction form can edit. */
export function isEditableTransaction(
  t: Transaction | null | undefined,
): t is Transaction & { type: EditableTxType } {
  if (!t) return false
  // A synthetic aggregate has no single underlying record to update, even
  // when its `type` happens to look editable.
  if (t.isSummary) return false
  return EDITABLE_TX_TYPES.includes(t.type as EditableTxType)
}

/**
 * Narrow a Transaction into the form's EditTransaction, or null when the row
 * isn't editable (a summary aggregate, or a lending/borrowing movement that
 * belongs to the Borrowings & Lending module).
 *
 * Callers should treat null as "don't open the edit form for this row" —
 * which is the behaviour the UI already relied on, it just wasn't expressed
 * in the types.
 */
export function toEditTransaction(
  t: Transaction | null | undefined,
): EditTransaction | null {
  if (!isEditableTransaction(t)) return null

  return {
    id: t.id,
    description: t.description,
    amount: t.amount,
    type: t.type,
    category: t.category,
    date: t.date,
    dueDate: t.dueDate,
    status: t.status,
    cardName: t.cardName,
    ownerType: t.ownerType ?? null,
    expenseType: t.expenseType ?? null,
    purpose: t.purpose ?? null,
  }
}

/**
 * The signed amount a row contributes to its credit card BILLING CYCLE total.
 *
 * Mirrors cardCycleAmount() in the backend's transactionClassification.js, and
 * is a different question from "what did this cost me":
 *
 *   - A refund or cashback SUBTRACTS — the card really was credited.
 *   - A split bill contributes its FULL amount, not just your share, because
 *     the bank charged the whole thing regardless of who owes you back.
 *
 * A cycle can legitimately total a negative number (cashback posted before any
 * spend), so callers must not clamp it to zero.
 */
export function cardCycleAmount(t: Pick<Transaction, "amount" | "txnKind">): number {
  const amount = Number(t.amount) || 0
  return t.txnKind === "refund" || t.txnKind === "cashback" ? -amount : amount
}
