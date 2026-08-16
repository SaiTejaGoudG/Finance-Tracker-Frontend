"use client"

import AppShell from "@/components/app-shell"
import BusinessTab from "@/components/business-tab"

export default function Page() {
  return (
    <AppShell title="Business" description="Track a side venture — invested, income, and net profit, month-wise">
      <BusinessTab />
    </AppShell>
  )
}
