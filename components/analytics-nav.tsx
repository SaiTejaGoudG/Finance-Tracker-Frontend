"use client"

/**
 * Sub-navigation for the analytics routes.
 *
 * These seven views are the same data sliced by dimension, so they read as a
 * subordinate underline row rather than a second tab bar. Unlike the nested
 * <Tabs> this replaces, each item is a real link: deep-linkable, back-button
 * friendly, and it only mounts the data for the slice you're looking at.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  TrendingUp,
  Wallet,
  Tag,
  LineChart,
  Coins,
  Users,
  Briefcase,
} from "lucide-react"
import { useFilters } from "@/context/FiltersContext"
import { cn } from "@/lib/utils"

export const ANALYTICS_ROUTES = [
  { href: "/analytics/income",       label: "Income",       icon: TrendingUp },
  { href: "/analytics/expenses",     label: "Expenses",     icon: Tag },
  { href: "/analytics/credit-cards", label: "Credit Cards", icon: Wallet },
  { href: "/analytics/investments",  label: "Investments",  icon: LineChart },
  { href: "/analytics/freelancing",  label: "Freelancing",  icon: Briefcase },
  { href: "/analytics/petty-cash",   label: "Petty Cash",   icon: Coins },
  { href: "/analytics/owner",        label: "By Owner",     icon: Users },
] as const

export default function AnalyticsNav() {
  const pathname = usePathname()
  const { withFilters } = useFilters()

  return (
    <nav
      aria-label="Analytics sections"
      className="flex gap-1 overflow-x-auto border-b"
    >
      {ANALYTICS_ROUTES.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={withFilters(href)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
