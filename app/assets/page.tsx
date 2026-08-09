"use client"

import AppShell from "@/components/app-shell"
import AssetsTab from "@/components/assets-tab"

export default function Page() {
  return (
    <AppShell title="Assets" description="What you own and how its value has moved">
      <AssetsTab />
    </AppShell>
  )
}
