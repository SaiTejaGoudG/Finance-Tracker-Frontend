"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Wallet, TrendingUp, Target, PiggyBank } from "lucide-react"
import { format } from "date-fns"

interface SavingsAccount {
  id: string
  accountName: string
  accountType: "Savings" | "Fixed Deposit" | "Recurring Deposit" | "Emergency Fund" | "Investment"
  currentBalance: number
  targetAmount?: number
  interestRate: number
  maturityDate?: string
  monthlyContribution?: number
  status: "Active" | "Matured" | "Closed"
  lastUpdated: string
}

interface SavingsTransaction {
  id: string
  accountId: string
  date: string
  type: "Deposit" | "Withdrawal" | "Interest"
  amount: number
  description: string
  balance: number
}

const mockSavingsAccounts: SavingsAccount[] = [
  {
    id: "1",
    accountName: "Emergency Fund",
    accountType: "Emergency Fund",
    currentBalance: 150000,
    targetAmount: 300000,
    interestRate: 4.0,
    monthlyContribution: 15000,
    status: "Active",
    lastUpdated: "2025-09-15",
  },
  {
    id: "2",
    accountName: "HDFC Fixed Deposit",
    accountType: "Fixed Deposit",
    currentBalance: 500000,
    interestRate: 6.5,
    maturityDate: "2026-03-15",
    status: "Active",
    lastUpdated: "2025-03-15",
  },
  {
    id: "3",
    accountName: "SBI Recurring Deposit",
    accountType: "Recurring Deposit",
    currentBalance: 120000,
    targetAmount: 240000,
    interestRate: 5.8,
    monthlyContribution: 10000,
    maturityDate: "2026-08-01",
    status: "Active",
    lastUpdated: "2025-09-01",
  },
  {
    id: "4",
    accountName: "Vacation Fund",
    accountType: "Savings",
    currentBalance: 75000,
    targetAmount: 200000,
    interestRate: 3.5,
    monthlyContribution: 8000,
    status: "Active",
    lastUpdated: "2025-09-10",
  },
]

const mockSavingsTransactions: SavingsTransaction[] = [
  {
    id: "1",
    accountId: "1",
    date: "2025-09-15",
    type: "Deposit",
    amount: 15000,
    description: "Monthly Emergency Fund Contribution",
    balance: 150000,
  },
  {
    id: "2",
    accountId: "3",
    date: "2025-09-01",
    type: "Deposit",
    amount: 10000,
    description: "Monthly RD Installment",
    balance: 120000,
  },
  {
    id: "3",
    accountId: "4",
    date: "2025-09-10",
    type: "Deposit",
    amount: 8000,
    description: "Vacation Fund Contribution",
    balance: 75000,
  },
  {
    id: "4",
    accountId: "2",
    date: "2025-06-15",
    type: "Interest",
    amount: 8125,
    description: "Quarterly Interest Credit",
    balance: 500000,
  },
]

export default function SavingsTab() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>(mockSavingsAccounts)
  const [transactions, setTransactions] = useState<SavingsTransaction[]>(mockSavingsTransactions)
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showTransactionHistory, setShowTransactionHistory] = useState(false)
  const [showAddTransaction, setShowAddTransaction] = useState(false)

  const [newAccount, setNewAccount] = useState({
    accountName: "",
    accountType: "Savings" as SavingsAccount["accountType"],
    currentBalance: "",
    targetAmount: "",
    interestRate: "",
    maturityDate: "",
    monthlyContribution: "",
  })

  const [newTransaction, setNewTransaction] = useState({
    type: "Deposit" as "Deposit" | "Withdrawal",
    amount: "",
    description: "",
  })

  const totalSavings = accounts.reduce((sum, account) => sum + account.currentBalance, 0)
  const totalTargets = accounts.reduce((sum, account) => sum + (account.targetAmount || 0), 0)
  const activeAccounts = accounts.filter((account) => account.status === "Active").length
  const monthlyContributions = accounts.reduce((sum, account) => sum + (account.monthlyContribution || 0), 0)

  const handleAddAccount = () => {
    const account: SavingsAccount = {
      id: (accounts.length + 1).toString(),
      accountName: newAccount.accountName,
      accountType: newAccount.accountType,
      currentBalance: Number.parseFloat(newAccount.currentBalance),
      targetAmount: newAccount.targetAmount ? Number.parseFloat(newAccount.targetAmount) : undefined,
      interestRate: Number.parseFloat(newAccount.interestRate),
      maturityDate: newAccount.maturityDate || undefined,
      monthlyContribution: newAccount.monthlyContribution
        ? Number.parseFloat(newAccount.monthlyContribution)
        : undefined,
      status: "Active",
      lastUpdated: format(new Date(), "yyyy-MM-dd"),
    }

    setAccounts([...accounts, account])
    setNewAccount({
      accountName: "",
      accountType: "Savings",
      currentBalance: "",
      targetAmount: "",
      interestRate: "",
      maturityDate: "",
      monthlyContribution: "",
    })
    setShowAddAccount(false)
  }

  const handleAddTransaction = () => {
    if (!selectedAccount) return

    const transaction: SavingsTransaction = {
      id: (transactions.length + 1).toString(),
      accountId: selectedAccount.id,
      date: format(new Date(), "yyyy-MM-dd"),
      type: newTransaction.type,
      amount: Number.parseFloat(newTransaction.amount),
      description: newTransaction.description,
      balance:
        selectedAccount.currentBalance +
        (newTransaction.type === "Deposit"
          ? Number.parseFloat(newTransaction.amount)
          : -Number.parseFloat(newTransaction.amount)),
    }

    setTransactions([...transactions, transaction])

    // Update account balance
    const updatedAccounts = accounts.map((account) =>
      account.id === selectedAccount.id
        ? { ...account, currentBalance: transaction.balance, lastUpdated: format(new Date(), "yyyy-MM-dd") }
        : account,
    )
    setAccounts(updatedAccounts)
    setSelectedAccount({ ...selectedAccount, currentBalance: transaction.balance })

    setNewTransaction({
      type: "Deposit",
      amount: "",
      description: "",
    })
    setShowAddTransaction(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "Matured":
        return <Badge className="bg-blue-100 text-blue-800">Matured</Badge>
      case "Closed":
        return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "Emergency Fund":
        return <PiggyBank className="h-4 w-4" />
      case "Fixed Deposit":
        return <Wallet className="h-4 w-4" />
      case "Recurring Deposit":
        return <TrendingUp className="h-4 w-4" />
      case "Investment":
        return <Target className="h-4 w-4" />
      default:
        return <Wallet className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalSavings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Amount</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₹{totalTargets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Combined savings goals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Contributions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{monthlyContributions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Regular savings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{activeAccounts}</div>
            <p className="text-xs text-muted-foreground">Savings accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Savings Accounts */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Savings Portfolio</CardTitle>
              <CardDescription>Manage your savings accounts and track progress towards goals</CardDescription>
            </div>
            <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Savings Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={newAccount.accountName}
                      onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                      placeholder="e.g., Emergency Fund, Vacation Savings"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select
                      value={newAccount.accountType}
                      onValueChange={(value) =>
                        setNewAccount({ ...newAccount, accountType: value as SavingsAccount["accountType"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Savings">Savings Account</SelectItem>
                        <SelectItem value="Fixed Deposit">Fixed Deposit</SelectItem>
                        <SelectItem value="Recurring Deposit">Recurring Deposit</SelectItem>
                        <SelectItem value="Emergency Fund">Emergency Fund</SelectItem>
                        <SelectItem value="Investment">Investment Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentBalance">Current Balance (₹)</Label>
                      <Input
                        id="currentBalance"
                        type="number"
                        value={newAccount.currentBalance}
                        onChange={(e) => setNewAccount({ ...newAccount, currentBalance: e.target.value })}
                        placeholder="50000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetAmount">Target Amount (₹)</Label>
                      <Input
                        id="targetAmount"
                        type="number"
                        value={newAccount.targetAmount}
                        onChange={(e) => setNewAccount({ ...newAccount, targetAmount: e.target.value })}
                        placeholder="200000"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="interestRate">Interest Rate (%)</Label>
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.1"
                        value={newAccount.interestRate}
                        onChange={(e) => setNewAccount({ ...newAccount, interestRate: e.target.value })}
                        placeholder="4.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthlyContribution">Monthly Contribution (₹)</Label>
                      <Input
                        id="monthlyContribution"
                        type="number"
                        value={newAccount.monthlyContribution}
                        onChange={(e) => setNewAccount({ ...newAccount, monthlyContribution: e.target.value })}
                        placeholder="10000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maturityDate">Maturity Date (Optional)</Label>
                    <Input
                      id="maturityDate"
                      type="date"
                      value={newAccount.maturityDate}
                      onChange={(e) => setNewAccount({ ...newAccount, maturityDate: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setShowAddAccount(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddAccount}>Add Account</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.map((account) => {
              const progressPercentage = account.targetAmount
                ? (account.currentBalance / account.targetAmount) * 100
                : 0

              return (
                <Card key={account.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2">
                      {getAccountTypeIcon(account.accountType)}
                      <div>
                        <h3 className="font-semibold text-lg">{account.accountName}</h3>
                        <p className="text-sm text-muted-foreground">{account.accountType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(account.status)}
                      <p className="text-sm text-muted-foreground mt-1">
                        Updated: {format(new Date(account.lastUpdated), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="font-semibold text-green-600">₹{account.currentBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Target Amount</p>
                      <p className="font-semibold">
                        {account.targetAmount ? `₹${account.targetAmount.toLocaleString()}` : "No target"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Rate</p>
                      <p className="font-semibold">{account.interestRate}% p.a.</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Contribution</p>
                      <p className="font-semibold">
                        {account.monthlyContribution ? `₹${account.monthlyContribution.toLocaleString()}` : "None"}
                      </p>
                    </div>
                  </div>

                  {account.targetAmount && (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Progress to Goal</span>
                        <span>{progressPercentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
                    </div>
                  )}

                  {account.maturityDate && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">
                        Maturity Date: {format(new Date(account.maturityDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAccount(account)
                        setShowTransactionHistory(true)
                      }}
                    >
                      Transaction History
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAccount(account)
                        setShowAddTransaction(true)
                      }}
                    >
                      Add Transaction
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Dialog */}
      <Dialog open={showTransactionHistory} onOpenChange={setShowTransactionHistory}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Transaction History - {selectedAccount?.accountName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions
                  .filter((transaction) => transaction.accountId === selectedAccount?.id)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(new Date(transaction.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            transaction.type === "Deposit"
                              ? "bg-green-100 text-green-800"
                              : transaction.type === "Withdrawal"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                          }
                        >
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={transaction.type === "Deposit" ? "text-green-600" : "text-red-600"}>
                        {transaction.type === "Deposit" ? "+" : "-"}₹{transaction.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>₹{transaction.balance.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Transaction - {selectedAccount?.accountName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transactionType">Transaction Type</Label>
              <Select
                value={newTransaction.type}
                onValueChange={(value) =>
                  setNewTransaction({ ...newTransaction, type: value as "Deposit" | "Withdrawal" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Deposit">Deposit</SelectItem>
                  <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transactionAmount">Amount (₹)</Label>
              <Input
                id="transactionAmount"
                type="number"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                placeholder="10000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transactionDescription">Description</Label>
              <Input
                id="transactionDescription"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                placeholder="Monthly contribution, Emergency withdrawal, etc."
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddTransaction(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTransaction}>Add Transaction</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
