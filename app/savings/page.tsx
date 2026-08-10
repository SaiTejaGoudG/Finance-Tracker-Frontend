"use client"

import AppShell from "@/components/app-shell"
import SavingsTab from "@/components/savings-tab"

export default function Page() {
  return (
    <AppShell title="Savings" description="Accounts, balances and contribution history">
      <SavingsTab />
    </AppShell>
  )
}
