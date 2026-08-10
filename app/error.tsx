"use client"

/**
 * Root error boundary. Previously the app had none at all — an unhandled
 * render error produced a blank white screen with no way back.
 */

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-6 text-center animate-slide-up">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive-subtle">
          <AlertTriangle
            className="h-6 w-6 text-destructive-subtle-foreground"
            aria-hidden="true"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred while loading this page. Your data is
            safe — retrying usually resolves it.
          </p>
        </div>

        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-2">
          <Button onClick={reset} size="sm">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Try again
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard">
              <Home className="mr-2 h-3.5 w-3.5" />
              Back to dashboard
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
