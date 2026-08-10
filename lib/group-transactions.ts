import { format, parseISO, isToday, isYesterday, isValid } from "date-fns"

/**
 * Groups a sorted transaction list into date buckets with per-day subtotals.
 *
 * Finance tables read far better grouped by day than as a flat list — the
 * user's mental model is "what did I spend on the 21st", and the day subtotal
 * answers that without reaching for a calculator.
 */

export interface GroupableTransaction {
  id: string
  date: string
  amount: number
  type: string
}

export interface TransactionGroup<T extends GroupableTransaction> {
  /** ISO date key, e.g. "2026-07-21" */
  key: string
  /** Human label: "Today", "Yesterday", or "21 Jul 2026" */
  label: string
  /** Weekday name, shown as secondary text */
  weekday: string
  items: T[]
  /** Net for the day: income counts positive, everything else negative */
  net: number
  /** Sum of outgoing amounts only */
  outflow: number
  /** Sum of incoming amounts only */
  inflow: number
}

function safeParse(date: string): Date | null {
  if (!date) return null
  try {
    const d = parseISO(date)
    return isValid(d) ? d : null
  } catch {
    return null
  }
}

function labelFor(d: Date | null, raw: string): { label: string; weekday: string } {
  if (!d) return { label: raw || "Unknown date", weekday: "" }
  if (isToday(d)) return { label: "Today", weekday: format(d, "d MMM yyyy") }
  if (isYesterday(d)) return { label: "Yesterday", weekday: format(d, "d MMM yyyy") }
  return { label: format(d, "d MMM yyyy"), weekday: format(d, "EEEE") }
}

export function groupByDate<T extends GroupableTransaction>(
  transactions: T[],
): TransactionGroup<T>[] {
  const buckets = new Map<string, TransactionGroup<T>>()

  for (const txn of transactions) {
    const parsed = safeParse(txn.date)
    const key = parsed ? format(parsed, "yyyy-MM-dd") : `unknown-${txn.date ?? ""}`

    if (!buckets.has(key)) {
      const { label, weekday } = labelFor(parsed, txn.date)
      buckets.set(key, {
        key,
        label,
        weekday,
        items: [],
        net: 0,
        outflow: 0,
        inflow: 0,
      })
    }

    const bucket = buckets.get(key)!
    bucket.items.push(txn)

    // Summary rows are aggregates of other rows — counting them double-counts
    if (txn.type === "summary") continue

    if (txn.type === "income") {
      bucket.inflow += txn.amount
      bucket.net += txn.amount
    } else {
      bucket.outflow += txn.amount
      bucket.net -= txn.amount
    }
  }

  // Map preserves insertion order, which follows the already-sorted input
  return Array.from(buckets.values())
}
