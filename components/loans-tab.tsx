"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Calendar, DollarSign, TrendingUp } from "lucide-react"
import { format } from "date-fns"

interface Loan {
  id: string
  lenderName: string
  principalAmount: number
  interestRate: number
  termMonths: number
  startDate: string
  monthlyEMI: number
  remainingBalance: number
  status: "Active" | "Completed" | "Overdue"
  nextPaymentDate: string
  totalPaid: number
  totalInterest: number
}

interface LoanPayment {
  id: string
  loanId: string
  paymentDate: string
  amount: number
  principalPaid: number
  interestPaid: number
  remainingBalance: number
  status: "Paid" | "Pending" | "Overdue"
}

const mockLoans: Loan[] = [
  {
    id: "1",
    lenderName: "HDFC Bank Personal Loan",
    principalAmount: 500000,
    interestRate: 12.5,
    termMonths: 36,
    startDate: "2023-01-15",
    monthlyEMI: 16680,
    remainingBalance: 350000,
    status: "Active",
    nextPaymentDate: "2025-10-15",
    totalPaid: 150000,
    totalInterest: 45000,
  },
  {
    id: "2",
    lenderName: "SBI Home Loan",
    principalAmount: 2500000,
    interestRate: 8.75,
    termMonths: 240,
    startDate: "2022-06-01",
    monthlyEMI: 23450,
    remainingBalance: 2200000,
    status: "Active",
    nextPaymentDate: "2025-10-01",
    totalPaid: 300000,
    totalInterest: 125000,
  },
  {
    id: "3",
    lenderName: "Friend - Emergency Loan",
    principalAmount: 50000,
    interestRate: 0,
    termMonths: 12,
    startDate: "2024-08-01",
    monthlyEMI: 4167,
    remainingBalance: 25000,
    status: "Active",
    nextPaymentDate: "2025-10-01",
    totalPaid: 25000,
    totalInterest: 0,
  },
]

const mockPayments: LoanPayment[] = [
  {
    id: "1",
    loanId: "1",
    paymentDate: "2025-09-15",
    amount: 16680,
    principalPaid: 12500,
    interestPaid: 4180,
    remainingBalance: 350000,
    status: "Paid",
  },
  {
    id: "2",
    loanId: "2",
    paymentDate: "2025-09-01",
    amount: 23450,
    principalPaid: 18200,
    interestPaid: 5250,
    remainingBalance: 2200000,
    status: "Paid",
  },
  {
    id: "3",
    loanId: "1",
    paymentDate: "2025-10-15",
    amount: 16680,
    principalPaid: 12600,
    interestPaid: 4080,
    remainingBalance: 337400,
    status: "Pending",
  },
]

export default function LoansTab() {
  const [loans, setLoans] = useState<Loan[]>(mockLoans)
  const [payments, setPayments] = useState<LoanPayment[]>(mockPayments)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [showAddLoan, setShowAddLoan] = useState(false)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)

  const [newLoan, setNewLoan] = useState({
    lenderName: "",
    principalAmount: "",
    interestRate: "",
    termMonths: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
  })

  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.remainingBalance, 0)
  const totalMonthlyEMI = loans
    .filter((loan) => loan.status === "Active")
    .reduce((sum, loan) => sum + loan.monthlyEMI, 0)
  const activeLoans = loans.filter((loan) => loan.status === "Active").length

  const handleAddLoan = () => {
    const monthlyEMI = calculateEMI(
      Number.parseFloat(newLoan.principalAmount),
      Number.parseFloat(newLoan.interestRate),
      Number.parseInt(newLoan.termMonths),
    )

    const loan: Loan = {
      id: (loans.length + 1).toString(),
      lenderName: newLoan.lenderName,
      principalAmount: Number.parseFloat(newLoan.principalAmount),
      interestRate: Number.parseFloat(newLoan.interestRate),
      termMonths: Number.parseInt(newLoan.termMonths),
      startDate: newLoan.startDate,
      monthlyEMI,
      remainingBalance: Number.parseFloat(newLoan.principalAmount),
      status: "Active",
      nextPaymentDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      totalPaid: 0,
      totalInterest: 0,
    }

    setLoans([...loans, loan])
    setNewLoan({
      lenderName: "",
      principalAmount: "",
      interestRate: "",
      termMonths: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
    })
    setShowAddLoan(false)
  }

  const calculateEMI = (principal: number, rate: number, months: number): number => {
    if (rate === 0) return principal / months
    const monthlyRate = rate / 100 / 12
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "Completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      case "Overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "Overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across {activeLoans} active loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly EMI</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{totalMonthlyEMI.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total monthly commitment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeLoans}</div>
            <p className="text-xs text-muted-foreground">Currently being repaid</p>
          </CardContent>
        </Card>
      </div>

      {/* Loans List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Loan Portfolio</CardTitle>
              <CardDescription>Manage your loans and track repayment progress</CardDescription>
            </div>
            <Dialog open={showAddLoan} onOpenChange={setShowAddLoan}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Loan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Loan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lenderName">Lender Name</Label>
                    <Input
                      id="lenderName"
                      value={newLoan.lenderName}
                      onChange={(e) => setNewLoan({ ...newLoan, lenderName: e.target.value })}
                      placeholder="e.g., HDFC Bank, Friend, etc."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="principalAmount">Principal Amount (₹)</Label>
                      <Input
                        id="principalAmount"
                        type="number"
                        value={newLoan.principalAmount}
                        onChange={(e) => setNewLoan({ ...newLoan, principalAmount: e.target.value })}
                        placeholder="500000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interestRate">Interest Rate (%)</Label>
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.1"
                        value={newLoan.interestRate}
                        onChange={(e) => setNewLoan({ ...newLoan, interestRate: e.target.value })}
                        placeholder="12.5"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="termMonths">Term (Months)</Label>
                      <Input
                        id="termMonths"
                        type="number"
                        value={newLoan.termMonths}
                        onChange={(e) => setNewLoan({ ...newLoan, termMonths: e.target.value })}
                        placeholder="36"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={newLoan.startDate}
                        onChange={(e) => setNewLoan({ ...newLoan, startDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setShowAddLoan(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddLoan}>Add Loan</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loans.map((loan) => {
              const progressPercentage = ((loan.principalAmount - loan.remainingBalance) / loan.principalAmount) * 100

              return (
                <Card key={loan.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{loan.lenderName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Started: {format(new Date(loan.startDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(loan.status)}
                      <p className="text-sm text-muted-foreground mt-1">
                        Next Payment: {format(new Date(loan.nextPaymentDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Principal</p>
                      <p className="font-semibold">₹{loan.principalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining</p>
                      <p className="font-semibold text-red-600">₹{loan.remainingBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly EMI</p>
                      <p className="font-semibold">₹{loan.monthlyEMI.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Rate</p>
                      <p className="font-semibold">{loan.interestRate}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Repayment Progress</span>
                      <span>{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>

                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLoan(loan)
                        setShowPaymentHistory(true)
                      }}
                    >
                      Payment History
                    </Button>
                    <Button size="sm">Make Payment</Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment History Dialog */}
      <Dialog open={showPaymentHistory} onOpenChange={setShowPaymentHistory}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Payment History - {selectedLoan?.lenderName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments
                  .filter((payment) => payment.loanId === selectedLoan?.id)
                  .map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.paymentDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>₹{payment.principalPaid.toLocaleString()}</TableCell>
                      <TableCell>₹{payment.interestPaid.toLocaleString()}</TableCell>
                      <TableCell>₹{payment.remainingBalance.toLocaleString()}</TableCell>
                      <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
