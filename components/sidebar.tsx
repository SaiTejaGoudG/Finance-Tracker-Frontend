"use client"

/**
 * Primary navigation.
 *
 * Grouped into sections because the flat four-item list no longer covers the
 * surface area — the dashboard's fifteen tabs are now real routes. Analytics
 * items are reached through their own sub-nav rather than being listed here, so
 * this stays scannable.
 *
 * Two earlier bugs fixed here: the active item used `bg-black text-white` with
 * no dark-mode inverse (black-on-black against the near-black dark background),
 * and an unused `MobileSidebar` duplicate was exported alongside the real one —
 * layout-wrapper.tsx implements its own drawer.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  CreditCard,
  Settings,
  LogOut,
  BarChart2,
  Wallet,
  TrendingUp,
  Gauge,
  Target,
  PiggyBank,
  Landmark,
  Building2,
  Sparkles,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"

type NavItem = { title: string; href: string; icon: React.ElementType }
type NavGroup = { label: string | null; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    label: null,
    items: [
      { title: "Dashboard", href: "/dashboard", icon: BarChart2 },
      { title: "Overview", href: "/overview", icon: LayoutDashboard },
      { title: "All Transactions", href: "/transactions", icon: CreditCard },
    ],
  },
  {
    label: "Analyse",
    items: [
      { title: "Analytics", href: "/analytics", icon: TrendingUp },
      { title: "Insights", href: "/insights", icon: Sparkles },
    ],
  },
  {
    label: "Plan",
    items: [
      { title: "Budget", href: "/budget", icon: Gauge },
      { title: "Goals", href: "/goals", icon: Target },
      { title: "Savings", href: "/savings", icon: PiggyBank },
      { title: "Loans", href: "/loans", icon: Landmark },
      { title: "Assets", href: "/assets", icon: Building2 },
    ],
  },
  {
    label: null,
    items: [{ title: "Configurations", href: "/configurations", icon: Settings }],
  },
]

interface SidebarProps {
  className?: string
  onClose?: () => void
}

export function Sidebar({ className, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "FT"

  // /analytics must stay lit while on /analytics/expenses etc.
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <div className={cn("flex h-full flex-col bg-sidebar pb-3", className)}>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary">
          <Wallet className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Finance Tracker
        </span>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-4 py-1" aria-label="Main navigation">
          {NAV.map((group, gi) => (
            <div key={gi} className="space-y-0.5">
              {group.label && (
                <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    {/* Active rail — reads as selection without a heavy fill */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                    {item.title}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Account */}
      <div className="mt-auto space-y-1 border-t px-2 pt-3">
        <div className="flex items-center gap-2.5 px-1.5 py-1">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start px-2.5 text-destructive-text hover:bg-destructive-subtle hover:text-destructive-text"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

export default Sidebar
