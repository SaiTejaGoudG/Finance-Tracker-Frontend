"use client"

import AppShell from "@/components/app-shell"
import LoansTab from "@/components/loans-tab"

export default function Page() {
  return (
    <AppShell title="Loans" description="Outstanding balances, EMI schedules and prepayment impact">
      <LoansTab />
    </AppShell>
  )
}
