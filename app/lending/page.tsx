"use client"

import AppShell from "@/components/app-shell"
import LendingTab from "@/components/lending-tab"

export default function Page() {
  return (
    <AppShell title="Borrowings & Lending" description="Who owes whom, and how much">
      <LendingTab />
    </AppShell>
  )
}
