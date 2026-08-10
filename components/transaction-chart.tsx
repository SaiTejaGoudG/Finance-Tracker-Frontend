"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface TransactionChartProps {
  data: Array<{
    month: string
    income: number
    expenses: number
    investments: number
  }>
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-md p-2.5 text-xs space-y-1">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums">₹{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function TransactionChart({ data }: TransactionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
            <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar dataKey="income" fill="hsl(var(--chart-3))" name="Income" />
            <Bar dataKey="expenses" fill="hsl(var(--chart-4))" name="Expenses" />
            <Bar dataKey="investments" fill="hsl(var(--chart-5))" name="Investments" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
