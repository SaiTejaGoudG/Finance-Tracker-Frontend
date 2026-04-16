"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Target, Calendar, TrendingUp, Star, CheckCircle } from "lucide-react"
import { format, differenceInDays } from "date-fns"

interface FinancialGoal {
  id: string
  title: string
  description: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  priority: "High" | "Medium" | "Low"
  category: "Emergency Fund" | "Vacation" | "Home Purchase" | "Education" | "Retirement" | "Investment" | "Other"
  status: "Active" | "Completed" | "Paused" | "Cancelled"
  monthlyContribution: number
  createdDate: string
  lastUpdated: string
}

interface GoalMilestone {
  id: string
  goalId: string
  title: string
  targetAmount: number
  targetDate: string
  status: "Pending" | "Completed"
  completedDate?: string
}

interface GoalContribution {
  id: string
  goalId: string
  amount: number
  date: string
  description: string
  type: "Manual" | "Automatic"
}

const mockGoals: FinancialGoal[] = [
  {
    id: "1",
    title: "Emergency Fund",
    description: "Build a 6-month emergency fund for financial security",
    targetAmount: 300000,
    currentAmount: 150000,
    targetDate: "2025-12-31",
    priority: "High",
    category: "Emergency Fund",
    status: "Active",
    monthlyContribution: 15000,
    createdDate: "2024-01-01",
    lastUpdated: "2025-09-15",
  },
  {
    id: "2",
    title: "Dream Vacation to Europe",
    description: "Save for a 2-week European vacation including flights, hotels, and activities",
    targetAmount: 200000,
    currentAmount: 75000,
    targetDate: "2026-06-01",
    priority: "Medium",
    category: "Vacation",
    status: "Active",
    monthlyContribution: 8000,
    createdDate: "2024-06-01",
    lastUpdated: "2025-09-10",
  },
  {
    id: "3",
    title: "Home Down Payment",
    description: "Save for down payment on a 2BHK apartment",
    targetAmount: 1000000,
    currentAmount: 250000,
    targetDate: "2027-03-31",
    priority: "High",
    category: "Home Purchase",
    status: "Active",
    monthlyContribution: 25000,
    createdDate: "2024-03-01",
    lastUpdated: "2025-09-01",
  },
  {
    id: "4",
    title: "New Laptop",
    description: "MacBook Pro for work and personal use",
    targetAmount: 150000,
    currentAmount: 150000,
    targetDate: "2025-08-31",
    priority: "Low",
    category: "Other",
    status: "Completed",
    monthlyContribution: 0,
    createdDate: "2025-01-01",
    lastUpdated: "2025-08-31",
  },
]

const mockMilestones: GoalMilestone[] = [
  {
    id: "1",
    goalId: "1",
    title: "25% of Emergency Fund",
    targetAmount: 75000,
    targetDate: "2025-06-30",
    status: "Completed",
    completedDate: "2025-06-15",
  },
  {
    id: "2",
    goalId: "1",
    title: "50% of Emergency Fund",
    targetAmount: 150000,
    targetDate: "2025-09-30",
    status: "Completed",
    completedDate: "2025-09-15",
  },
  {
    id: "3",
    goalId: "1",
    title: "75% of Emergency Fund",
    targetAmount: 225000,
    targetDate: "2025-12-31",
    status: "Pending",
  },
  {
    id: "4",
    goalId: "2",
    title: "Flight Booking Amount",
    targetAmount: 80000,
    targetDate: "2026-01-31",
    status: "Pending",
  },
]

const mockContributions: GoalContribution[] = [
  {
    id: "1",
    goalId: "1",
    amount: 15000,
    date: "2025-09-15",
    description: "Monthly Emergency Fund Contribution",
    type: "Automatic",
  },
  {
    id: "2",
    goalId: "2",
    amount: 8000,
    date: "2025-09-10",
    description: "Monthly Vacation Savings",
    type: "Automatic",
  },
  {
    id: "3",
    goalId: "3",
    amount: 25000,
    date: "2025-09-01",
    description: "Monthly Home Down Payment",
    type: "Automatic",
  },
  {
    id: "4",
    goalId: "1",
    amount: 5000,
    date: "2025-09-05",
    description: "Bonus contribution from freelance work",
    type: "Manual",
  },
]

export default function GoalsTab() {
  const [goals, setGoals] = useState<FinancialGoal[]>(mockGoals)
  const [milestones, setMilestones] = useState<GoalMilestone[]>(mockMilestones)
  const [contributions, setContributions] = useState<GoalContribution[]>(mockContributions)
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showGoalDetails, setShowGoalDetails] = useState(false)
  const [showAddContribution, setShowAddContribution] = useState(false)

  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    targetAmount: "",
    targetDate: "",
    priority: "Medium" as FinancialGoal["priority"],
    category: "Other" as FinancialGoal["category"],
    monthlyContribution: "",
  })

  const [newContribution, setNewContribution] = useState({
    amount: "",
    description: "",
  })

  const activeGoals = goals.filter((goal) => goal.status === "Active")
  const completedGoals = goals.filter((goal) => goal.status === "Completed")
  const totalTargetAmount = activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0)
  const totalCurrentAmount = activeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0)
  const totalMonthlyContributions = activeGoals.reduce((sum, goal) => sum + goal.monthlyContribution, 0)

  const handleAddGoal = () => {
    const goal: FinancialGoal = {
      id: (goals.length + 1).toString(),
      title: newGoal.title,
      description: newGoal.description,
      targetAmount: Number.parseFloat(newGoal.targetAmount),
      currentAmount: 0,
      targetDate: newGoal.targetDate,
      priority: newGoal.priority,
      category: newGoal.category,
      status: "Active",
      monthlyContribution: Number.parseFloat(newGoal.monthlyContribution),
      createdDate: format(new Date(), "yyyy-MM-dd"),
      lastUpdated: format(new Date(), "yyyy-MM-dd"),
    }

    setGoals([...goals, goal])
    setNewGoal({
      title: "",
      description: "",
      targetAmount: "",
      targetDate: "",
      priority: "Medium",
      category: "Other",
      monthlyContribution: "",
    })
    setShowAddGoal(false)
  }

  const handleAddContribution = () => {
    if (!selectedGoal) return

    const contribution: GoalContribution = {
      id: (contributions.length + 1).toString(),
      goalId: selectedGoal.id,
      amount: Number.parseFloat(newContribution.amount),
      date: format(new Date(), "yyyy-MM-dd"),
      description: newContribution.description,
      type: "Manual",
    }

    setContributions([...contributions, contribution])

    // Update goal current amount
    const updatedGoals = goals.map((goal) =>
      goal.id === selectedGoal.id
        ? {
            ...goal,
            currentAmount: goal.currentAmount + contribution.amount,
            lastUpdated: format(new Date(), "yyyy-MM-dd"),
            status: goal.currentAmount + contribution.amount >= goal.targetAmount ? "Completed" : goal.status,
          }
        : goal,
    )
    setGoals(updatedGoals)
    setSelectedGoal({
      ...selectedGoal,
      currentAmount: selectedGoal.currentAmount + contribution.amount,
    })

    setNewContribution({
      amount: "",
      description: "",
    })
    setShowAddContribution(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "Completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      case "Paused":
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>
      case "Cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return <Badge className="bg-red-100 text-red-800">High</Badge>
      case "Medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
      case "Low":
        return <Badge className="bg-green-100 text-green-800">Low</Badge>
      default:
        return <Badge>{priority}</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Emergency Fund":
        return <Target className="h-4 w-4" />
      case "Vacation":
        return <Calendar className="h-4 w-4" />
      case "Home Purchase":
        return <Target className="h-4 w-4" />
      case "Education":
        return <TrendingUp className="h-4 w-4" />
      case "Retirement":
        return <Star className="h-4 w-4" />
      case "Investment":
        return <TrendingUp className="h-4 w-4" />
      default:
        return <Target className="h-4 w-4" />
    }
  }

  const getDaysRemaining = (targetDate: string) => {
    return differenceInDays(new Date(targetDate), new Date())
  }

  const totalGoals = goals.length
  const activeGoalsCount = goals.filter((goal) => goal.status === "Active").length
  const completedGoalsCount = goals.filter((goal) => goal.status === "Completed").length
  const totalTargetAmountAll = goals.reduce((sum, goal) => sum + goal.targetAmount, 0)
  const totalCurrentAmountAll = goals.reduce((sum, goal) => sum + goal.currentAmount, 0)
  const totalMonthlyContributionsAll = goals
    .filter((goal) => goal.status === "Active")
    .reduce((sum, goal) => sum + goal.monthlyContribution, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeGoals.length}</div>
            <p className="text-xs text-muted-foreground">{completedGoals.length} completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Target</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">₹{totalTargetAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across active goals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalCurrentAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((totalCurrentAmount / totalTargetAmount) * 100).toFixed(1)}% of target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Contributions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{totalMonthlyContributions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Automatic savings</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Financial Goals</CardTitle>
              <CardDescription>Track your progress towards achieving your financial objectives</CardDescription>
            </div>
            <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Financial Goal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goalTitle">Goal Title</Label>
                    <Input
                      id="goalTitle"
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                      placeholder="e.g., Emergency Fund, Dream Vacation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goalDescription">Description</Label>
                    <Textarea
                      id="goalDescription"
                      value={newGoal.description}
                      onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                      placeholder="Describe your goal and why it's important to you"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetAmount">Target Amount (₹)</Label>
                      <Input
                        id="targetAmount"
                        type="number"
                        value={newGoal.targetAmount}
                        onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                        placeholder="300000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetDate">Target Date</Label>
                      <Input
                        id="targetDate"
                        type="date"
                        value={newGoal.targetDate}
                        onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={newGoal.priority}
                        onValueChange={(value) =>
                          setNewGoal({ ...newGoal, priority: value as FinancialGoal["priority"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={newGoal.category}
                        onValueChange={(value) =>
                          setNewGoal({ ...newGoal, category: value as FinancialGoal["category"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Emergency Fund">Emergency Fund</SelectItem>
                          <SelectItem value="Vacation">Vacation</SelectItem>
                          <SelectItem value="Home Purchase">Home Purchase</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Retirement">Retirement</SelectItem>
                          <SelectItem value="Investment">Investment</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyContribution">Monthly Contribution (₹)</Label>
                    <Input
                      id="monthlyContribution"
                      type="number"
                      value={newGoal.monthlyContribution}
                      onChange={(e) => setNewGoal({ ...newGoal, monthlyContribution: e.target.value })}
                      placeholder="15000"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setShowAddGoal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddGoal}>Add Goal</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {goals.map((goal) => {
              const progressPercentage = (goal.currentAmount / goal.targetAmount) * 100
              const daysRemaining = getDaysRemaining(goal.targetDate)

              return (
                <Card key={goal.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(goal.category)}
                      <div>
                        <h3 className="font-semibold text-lg">{goal.title}</h3>
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {getStatusBadge(goal.status)}
                      {getPriorityBadge(goal.priority)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Amount</p>
                      <p className="font-semibold text-green-600">₹{goal.currentAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Target Amount</p>
                      <p className="font-semibold">₹{goal.targetAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Contribution</p>
                      <p className="font-semibold">₹{goal.monthlyContribution.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Days Remaining</p>
                      <p
                        className={`font-semibold ${daysRemaining < 30 ? "text-red-600" : daysRemaining < 90 ? "text-yellow-600" : "text-green-600"}`}
                      >
                        {daysRemaining > 0 ? `${daysRemaining} days` : "Overdue"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      ₹{(goal.targetAmount - goal.currentAmount).toLocaleString()} remaining
                    </p>
                  </div>

                  <div className="text-sm text-muted-foreground mb-4">
                    <p>Target Date: {format(new Date(goal.targetDate), "MMM dd, yyyy")}</p>
                    <p>Last Updated: {format(new Date(goal.lastUpdated), "MMM dd, yyyy")}</p>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedGoal(goal)
                        setShowGoalDetails(true)
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedGoal(goal)
                        setShowAddContribution(true)
                      }}
                      disabled={goal.status !== "Active"}
                    >
                      Add Contribution
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Goal Details Dialog */}
      <Dialog open={showGoalDetails} onOpenChange={setShowGoalDetails}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Goal Details - {selectedGoal?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Milestones */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Milestones</h3>
              <div className="space-y-2">
                {milestones
                  .filter((milestone) => milestone.goalId === selectedGoal?.id)
                  .map((milestone) => (
                    <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {milestone.status === "Completed" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Target className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium">{milestone.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Target: ₹{milestone.targetAmount.toLocaleString()} by{" "}
                            {format(new Date(milestone.targetDate), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {milestone.status === "Completed" ? (
                          <Badge className="bg-green-100 text-green-800">Completed</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
                        )}
                        {milestone.completedDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Completed: {format(new Date(milestone.completedDate), "MMM dd, yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Contribution History */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Recent Contributions</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions
                    .filter((contribution) => contribution.goalId === selectedGoal?.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((contribution) => (
                      <TableRow key={contribution.id}>
                        <TableCell>{format(new Date(contribution.date), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="text-green-600">+₹{contribution.amount.toLocaleString()}</TableCell>
                        <TableCell>{contribution.description}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              contribution.type === "Automatic"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }
                          >
                            {contribution.type}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Contribution Dialog */}
      <Dialog open={showAddContribution} onOpenChange={setShowAddContribution}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Contribution - {selectedGoal?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contributionAmount">Amount (₹)</Label>
              <Input
                id="contributionAmount"
                type="number"
                value={newContribution.amount}
                onChange={(e) => setNewContribution({ ...newContribution, amount: e.target.value })}
                placeholder="5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contributionDescription">Description</Label>
              <Input
                id="contributionDescription"
                value={newContribution.description}
                onChange={(e) => setNewContribution({ ...newContribution, description: e.target.value })}
                placeholder="Bonus, extra savings, etc."
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddContribution(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddContribution}>Add Contribution</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
