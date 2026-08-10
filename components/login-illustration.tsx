"use client"

import Image from "next/image"

export default function LoginIllustration() {
  return (
    <div className="relative h-full w-full flex items-center justify-center bg-gradient-to-br from-info-subtle to-muted">
      <div className="text-center space-y-6 p-8">
        <div className="relative w-80 h-60 mx-auto">
          <Image
            src="/images/finance-login.jpg"
            alt="Finance Management Illustration"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Take Control of Your Finances</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Track your income, expenses, and investments all in one place. Make informed financial decisions with
            detailed insights and analytics.
          </p>
        </div>
        <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span>Income Tracking</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-destructive rounded-full"></div>
            <span>Expense Management</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-info rounded-full"></div>
            <span>Investment Insights</span>
          </div>
        </div>
      </div>
    </div>
  )
}
