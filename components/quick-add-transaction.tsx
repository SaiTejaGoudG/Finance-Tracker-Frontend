"use client"

/**
 * App-wide quick add.
 *
 * Logging a transaction is by far the most frequent thing anyone does in
 * this app, and until now it had no global affordance at all — you had to
 * navigate to All Transactions (or Business, or Lending) first, and only
 * then could you open a form. That's a page load and two clicks standing in
 * front of the single most common action.
 *
 * Mounted once from LayoutWrapper so it's reachable from every authenticated
 * screen, via either:
 *   - Cmd/Ctrl + K   (the convention people already expect)
 *   - a floating + button, bottom-right
 *
 * Reuses TransactionForm rather than reimplementing entry, so validation,
 * category creation, splits and refunds all behave identically to the
 * full-page flow. TransactionForm performs its own POST, so this only has to
 * close, toast and let the page refresh itself.
 */

import { useState, useEffect, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import TransactionForm from "@/components/transaction-form"
import { toast } from "@/hooks/use-toast"
import { invalidateCache } from "@/lib/request-cache"

export default function QuickAddTransaction({ enabled = true }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Cmd/Ctrl+K from anywhere.
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return

      // Don't hijack the shortcut while the user is typing — a search box or
      // textarea may want it, and stealing focus mid-edit is hostile.
      const el = document.activeElement as HTMLElement | null
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el?.isContentEditable
      if (typing) return

      e.preventDefault()
      setOpen((prev) => !prev)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [enabled])

  const handleSubmitted = useCallback(async () => {
    setOpen(false)
    toast({ title: "Transaction added" })

    // The new row invalidates any cached list/summary the current screen may
    // be showing. router.refresh() re-runs the route, and dropping the
    // client cache entries stops a stale list being served back instantly.
    invalidateCache("transaction/listing")
    invalidateCache("dashboard")
    invalidateCache("business-ledgers")
    router.refresh()
  }, [router])

  if (!enabled) return null

  // The login/signup screens render outside the authenticated shell, but
  // guard anyway so the button can never appear over them.
  if (pathname === "/login" || pathname === "/signup") return null

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        aria-label="Add transaction"
        title="Add transaction  (Ctrl/⌘ K)"
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full p-0 shadow-lg transition-transform hover:scale-105 focus-visible:scale-105"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>Add transaction</span>
              <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-3xs font-normal text-muted-foreground sm:inline-block">
                Ctrl/⌘ K
              </kbd>
            </DialogTitle>
          </DialogHeader>
          <TransactionForm onSubmit={handleSubmitted} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
