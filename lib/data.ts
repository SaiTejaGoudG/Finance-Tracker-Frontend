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

// ─── Built-in categories ──────────────────────────────────────────────────────
// Single source of truth. components/dashboard.tsx derives its {name, icon}
// arrays from these rather than keeping a second, drifting copy.
// Users can add their own on top of these — see the user_categories table and
// hooks/use-categories.ts, which merges both.

// Income categories
export const incomeCategories = ["Airbnb", "Salary", "Interest", "Freelancing", "Others"]

// Expense categories
export const expenseCategories = [
  "Airbnb",
  "Bike Fuel",
  "Bike Service",
  "Car Accessories",
  "Car Fuel",
  "Car Service",
  "Chitti",
  "Credit Card Payment",
  "Debt",
  "Desktop",
  "Dining",
  "Education",
  "Electronics",
  "EMI",
  "Entertainment",
  "Food",
  "Freelancing",
  "Gadgets",
  "Gardening",
  "Gifts",
  "Grocery",
  "Healthcare",
  "Housing",
  "Other Expenses",
  "Party",
  "Personal Care",
  "Shopping",
  "Snacks & Beverages",
  "Street Food",
  "Transport",
  "Travel",
  "Utilities",
  "Watch",
]

// Credit categories (for credit card transactions)
export const creditCategories = [
  "Airbnb",
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
export const investmentCategories = ["Airbnb", "Chitti", "SIP"]

// Asset categories (physical assets — land, gold, property, vehicles)
export const assetCategories = [
  "Airbnb",
  "Equipment",
  "Land",
  "Other Asset",
  "Physical Gold",
  "Property / Flat",
  "Vehicle",
]

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
