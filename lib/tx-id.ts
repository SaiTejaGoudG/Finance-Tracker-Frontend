/**
 * Transaction id helpers.
 *
 * Not every row in the transactions list is a real database record. EMI rows
 * are *projected* from a loan's amortization schedule and carry a synthetic id
 * of the form `emi_<something>`. They have no row in the transactions table, so
 * they cannot be updated, deleted, or marked paid through the transaction API.
 *
 * The bug this guards against:
 *
 *   Number.parseInt("emi_12")            -> NaN
 *   JSON.stringify({ id: NaN })          -> '{"id":null}'
 *
 * JSON has no NaN, so it silently serialises to null. The request then reaches
 * the backend as `{"id":null,"status":"Paid"}` and comes back
 * 400 "Transaction ID is required" — with nothing in the payload hinting that
 * the real problem was an EMI row. Always go through `toTransactionId` so the
 * failure happens locally, with a message that says what actually went wrong.
 */

/** True for projected rows that have no underlying transactions-table record. */
export function isSyntheticId(id: string | number | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("emi_")
}

/**
 * Convert a row id to the numeric id the API expects.
 * Returns null for synthetic or otherwise unparseable ids — callers must
 * handle null rather than sending it.
 */
export function toTransactionId(id: string | number | null | undefined): number | null {
  if (id === null || id === undefined) return null
  if (typeof id === "number") return Number.isFinite(id) ? id : null
  if (isSyntheticId(id)) return null

  const parsed = Number.parseInt(id, 10)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Explanation shown when someone tries to act on a projected row.
 * EMI schedules are managed from the loan, not the transaction.
 */
export const SYNTHETIC_ROW_MESSAGE =
  "This is a projected EMI from your loan schedule, not a recorded transaction. Manage it from the Loans screen."
