"use client"

import Dashboard from "@/components/dashboard"
import LayoutWrapper from "@/components/layout-wrapper"
import { useAuth } from "@/context/AuthContext"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Middleware + AuthProvider will handle redirect; render nothing while redirecting
    return null
  }

  return (
    <LayoutWrapper>
      <Dashboard />
    </LayoutWrapper>
  )
}
