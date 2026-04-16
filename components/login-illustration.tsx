"use client"

import Image from "next/image"

export default function LoginIllustration() {
  return (
    <div className="relative h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
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
          <h2 className="text-2xl font-bold text-gray-900">Take Control of Your Finances</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Track your income, expenses, and investments all in one place. Make informed financial decisions with
            detailed insights and analytics.
          </p>
        </div>
        <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Income Tracking</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Expense Management</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Investment Insights</span>
          </div>
        </div>
      </div>
    </div>
  )
}
