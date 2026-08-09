"use client"

/**
 * /analytics has no content of its own — it forwards to the first slice,
 * preserving any filter params so a deep link to /analytics?startDate=… still
 * lands on a filtered view.
 */

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CenteredSpinner } from "@/components/ui/states"

function Redirector() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(`/analytics/expenses${qs ? `?${qs}` : ""}`)
  }, [router, searchParams])

  return <CenteredSpinner label="Opening analytics…" />
}

export default function AnalyticsIndexPage() {
  return (
    <Suspense fallback={null}>
      <Redirector />
    </Suspense>
  )
}
