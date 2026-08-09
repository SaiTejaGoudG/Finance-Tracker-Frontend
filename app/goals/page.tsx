"use client"

import AppShell from "@/components/app-shell"
import GoalsTab from "@/components/goals-tab"

export default function Page() {
  return (
    <AppShell title="Goals" description="Targets, milestones and progress toward each">
      <GoalsTab />
    </AppShell>
  )
}
