import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/context/AuthContext"

/**
 * `inter.variable` must go on <html>, NOT <body>.
 *
 * globals.css declares `--font-sans: var(--font-inter), …` inside `:root`,
 * which IS the <html> element. A nested var() resolves against the element the
 * property is declared on — so with `--font-inter` defined only on <body>, the
 * lookup failed on <html>, `--font-sans` became invalid at computed-value time,
 * the `font-family` declaration was discarded, and every page silently fell
 * back to the browser's default serif.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Manage your finances with ease",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
