export type Transaction = {
  id: string
  description: string
  amount: number
  type: "income" | "expense" | "credit" | "petty-cash" | "investment"
  category: string
  date: string
  dueDate?: string
  status?: "Pending" | "Paid"
  cardName?: string
  cardId?: string
}

// Credit cards data
export const creditCards = ["Amazon ICICI", "Axis MY Zone", "HDFC Regalia", "SBI SimplyCLICK"]

// Income categories
export const incomeCategories = ["Salary", "Interest", "Freelancing", "Others"]

// Expense categories
export const expenseCategories = [
  "Bike Fuel",
  "Bike Service",
  "Car Accessories",
  "Car Fuel",
  "Car Service",
  "Chitti",
  "Credit Card Payment",
  "Debt",
  "Education",
  "Electronics",
  "EMI",
  "Entertainment",
  "Food",
  "Freelancing",
  "Gadgets",
  "Gardening",
  "Gifts",
  "Healthcare",
  "Housing",
  "Other Expenses",
  "Party",
  "Personal Care",
  "Shopping",
  "Transport",
  "Travel",
  "Utilities",
]

// Credit categories (for credit card transactions)
export const creditCategories = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Education",
  "Travel",
  "Groceries",
  "Freelancing",
  "Debt",
  "EMI",
  "Other Expenses",
]

// Investment categories
export const investmentCategories = ["Chitti", "SIP"]

// Generate sample transactions
export const generateSampleTransactions = (): Transaction[] => {
  return [
    {
      id: "1",
      description: "Monthly Salary",
      amount: 75000,
      type: "income",
      category: "Salary",
      date: "2025-01-01",
      status: "Paid",
    },
    {
      id: "2",
      description: "Grocery Shopping",
      amount: 3500,
      type: "expense",
      category: "Food",
      date: "2025-01-02",
      dueDate: "2025-01-02",
      status: "Paid",
    },
    {
      id: "3",
      description: "Amazon Purchase",
      amount: 2500,
      type: "credit",
      category: "Shopping",
      date: "2025-01-03",
      dueDate: "2025-02-01",
      status: "Pending",
      cardName: "Amazon ICICI",
      cardId: "1",
    },
  ]
}
