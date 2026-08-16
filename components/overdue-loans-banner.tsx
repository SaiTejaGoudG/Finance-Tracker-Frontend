"use client"

/**
 * Surfaces overdue personal loans (Borrowings & Lending) — a loan past its
 * due_date that isn't fully settled yet. Self-fetching (no filter props),
 * since "who's overdue right now" isn't time-range scoped like analytics.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ChevronDown, ChevronUp, PartyPopper } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmptyState, SkeletonText } from "@/components/ui/states"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"
import { format, parseISO } from "date-fns"

interface OverdueLoan {
  id: number
  person_name: string
  direction: "lent" | "borrowed"
  outstanding_amount: string | number
  due_date: string
}

function fmtINR(v: number) {
  return `₹${Math.abs(Math.round(v)).toLocaleString("en-IN")}`
}

function fmtDate(s: string) {
  try { return format(parseISO(s), "dd MMM yyyy") } catch { return s }
}

export default function OverdueLoansBanner({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [overdue, setOverdue] = useState<OverdueLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    apiClient(apiUrl("/personal-loans/summary"))
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setOverdue(json.data?.overdue || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <SkeletonText lines={2} />

  if (overdue.length === 0) {
    if (compact) return null
    return (
      <EmptyState
        compact
        icon={PartyPopper}
        title="Nothing overdue"
        description="All your borrowings and lendings are within their due dates."
      />
    )
  }

  const shown = expanded ? overdue : overdue.slice(0, 2)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {overdue.length} loan{overdue.length !== 1 ? "s" : ""} overdue
        </p>
        {overdue.length > 2 && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show all</>}
          </button>
        )}
      </div>

      {shown.map((l) => (
        <Link
          key={l.id}
          href="/lending"
          className="flex items-start justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive-subtle px-4 py-3 text-sm hover:brightness-95 transition-[filter]"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive-subtle-foreground" />
            <div>
              <span className="font-semibold">{l.person_name}</span>
              <span className="text-muted-foreground"> {l.direction === "lent" ? "owes you" : "you owe"} </span>
              <span className="font-semibold tnum">{fmtINR(Number(l.outstanding_amount))}</span>
              <span className="text-muted-foreground"> — was due </span>
              <span className="font-medium text-foreground">{fmtDate(l.due_date)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
