/**
 * card-meta.ts — per-card label color overrides.
 *
 * Mirrors lib/tx-meta.ts's category override pattern: a plain module-level
 * cache rather than a prop threaded through every call site that renders a
 * card-name badge (All Transactions, the Business ledger list, Borrowings &
 * Lending, ...) — those call sites only ever have a card *name* string on
 * hand (it's denormalized onto the transaction row), not the live
 * credit_cards record. useCardColorSync() (hooks/use-credit-cards.ts)
 * populates this once, app-wide, from LayoutWrapper; every existing badge
 * then calls getCardColor(name) with no other changes needed.
 *
 * Unlike categories, there's no static built-in palette to fall back to
 * here — a card with no custom color just keeps its existing neutral
 * "bg-muted" badge styling, so getCardColor returns null (not a default
 * hex) when no override is set. Keyed lowercase so it matches regardless
 * of stored casing.
 */

let cardColorOverrides: Record<string, string> = {}

export function setCardColors(overrides: Record<string, string | null | undefined>) {
  const next: Record<string, string> = {}
  for (const [name, color] of Object.entries(overrides)) {
    if (color) next[name.toLowerCase()] = color
  }
  cardColorOverrides = next
}

/**
 * Add/update a single override without waiting for the next full sync —
 * used right after saving a card's color in Configurations, so it shows up
 * immediately elsewhere for the rest of the session. Passing null/empty
 * clears the override (reverting to the default muted badge).
 */
export function registerCardColor(cardName: string, color?: string | null) {
  const key = cardName.toLowerCase()
  if (!color) {
    if (!(key in cardColorOverrides)) return
    const { [key]: _drop, ...rest } = cardColorOverrides
    cardColorOverrides = rest
    return
  }
  cardColorOverrides = { ...cardColorOverrides, [key]: color }
}

/** null = no custom color set — caller should keep its default styling. */
export function getCardColor(cardName: string | null | undefined): string | null {
  if (!cardName) return null
  return cardColorOverrides[cardName.toLowerCase()] ?? null
}
