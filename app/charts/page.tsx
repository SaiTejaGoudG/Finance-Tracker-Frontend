"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

// Sample data for charts
const monthlyData = [
  { month: "Jan", income: 75000, expenses: 45000, investments: 15000 },
  { month: "Feb", income: 80000, expenses: 48000, investments: 18000 },
  { month: "Mar", income: 72000, expenses: 42000, investments: 16000 },
  { month: "Apr", income: 85000, expenses: 52000, investments: 20000 },
  { month: "May", income: 78000, expenses: 46000, investments: 17000 },
  { month: "Jun", income: 82000, expenses: 49000, investments: 19000 },
]

const expenseData = [
  { name: "Food", value: 15000, color: "#8884d8" },
  { name: "Transport", value: 8000, color: "#82ca9d" },
  { name: "Utilities", value: 5000, color: "#ffc658" },
  { name: "Entertainment", value: 3000, color: "#ff7300" },
  { name: "Shopping", value: 7000, color: "#00ff00" },
  { name: "Healthcare", value: 4000, color: "#ff0000" },
]

const trendData = [
  { month: "Jan", balance: 30000 },
  { month: "Feb", balance: 32000 },
  { month: "Mar", balance: 30000 },
  { month: "Apr", balance: 33000 },
  { month: "May", balance: 32000 },
  { month: "Jun", balance: 33000 },
]

export default function ChartsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("6months")

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Financial Charts</h1>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="1year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Income vs Expenses Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Income vs Expenses vs Investments</CardTitle>
            <CardDescription>Monthly comparison of your financial flows</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="income" fill="#22c55e" name="Income" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                <Bar dataKey="investments" fill="#3b82f6" name="Investments" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Distribution</CardTitle>
            <CardDescription>Breakdown of your spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Balance Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Balance Trend</CardTitle>
            <CardDescription>Your account balance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="balance" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Monthly Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹78,500</div>
            <p className="text-xs text-muted-foreground">+2.5% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Monthly Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹47,000</div>
            <p className="text-xs text-muted-foreground">-1.2% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Monthly Investments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹17,500</div>
            <p className="text-xs text-muted-foreground">+5.8% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">40.1%</div>
            <p className="text-xs text-muted-foreground">+3.2% from last period</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
