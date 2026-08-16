"use client"

import type React from "react"

import { useState } from "react"
import Sidebar from "./sidebar"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, User } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "@/context/AuthContext"
import { useCategorySync } from "@/hooks/use-categories"
import { useCardColorSync } from "@/hooks/use-credit-cards"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout, isAuthenticated } = useAuth()

  // Registers any custom category emoji (set in Configurations -> Categories)
  // into lib/tx-meta.ts's override cache once per authenticated session, so
  // getCategoryMeta(name) picks them up everywhere it's already called — the
  // transaction list, dashboard charts, category pickers — with no changes
  // needed at those call sites. This wrapper is the one thing every
  // authenticated page renders (AppShell pages and the standalone
  // Configurations page both use it), so it's the right single place for a
  // once-per-session fetch rather than repeating it per-page.
  useCategorySync(isAuthenticated)
  // Same rationale as useCategorySync above, for credit_cards.color instead.
  useCardColorSync(isAuthenticated)

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "FT"

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm animate-fade-in lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-sidebar transition-transform duration-300 ease-in-out lg:static lg:inset-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b bg-background/80 px-4 py-2.5 backdrop-blur-sm lg:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold lg:hidden">Finance Tracker</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 h-9 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                    {user?.name ?? "Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/configurations?tab=profile" className="flex items-center cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive-text focus:text-destructive-text"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
