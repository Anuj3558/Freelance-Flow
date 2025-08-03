"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import { Button } from "./ui/button"
import { Input, TextArea } from "./ui/input"
import { Select } from "./ui/select"
import { Modal } from "./ui/modal"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table"
import { CardSkeleton, TableSkeleton } from "./ui/skeleton"
import { useNotification } from "./ui/notification"

interface Expense {
  id: number
  title: string
  description: string
  amount: number
  category: string
  date: string
  paymentMethod: string
  receipt?: string
  isRecurring: boolean
  recurringFrequency?: "monthly" | "quarterly" | "yearly"
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface ExpenseStats {
  totalExpenses: number
  monthlyExpenses: number
  categoryBreakdown: { [key: string]: number }
  recentExpenses: Expense[]
}

const API_URL = "http://localhost:5000/api/expenses"

const EXPENSE_CATEGORIES = [
  "Software & Tools",
  "Hardware & Equipment",
  "Office Supplies",
  "Marketing & Advertising",
  "Travel & Transportation",
  "Meals & Entertainment",
  "Professional Services",
  "Education & Training",
  "Utilities",
  "Rent & Facilities",
  "Insurance",
  "Taxes",
  "Other",
]

const PAYMENT_METHODS = ["Credit Card", "Debit Card", "Bank Transfer", "Cash", "PayPal", "Check", "Other"]

export default function ExpenseManagement() {
  const { addNotification } = useNotification()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<ExpenseStats>({
    totalExpenses: 0,
    monthlyExpenses: 0,
    categoryBreakdown: {},
    recentExpenses: [],
  })
  const [loading, setLoading] = useState(true)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [dateFilter, setDateFilter] = useState("All")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    category: "Software & Tools",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "Credit Card",
    isRecurring: false,
    recurringFrequency: "monthly" as "monthly" | "quarterly" | "yearly",
    tags: "",
  })

  // Get JWT token from cookies
  const getAuthToken = () => {
    const token = Cookies.get("jwt_token")
    if (!token) {
      addNotification({
        type: "error",
        title: "Authentication Error",
        message: "Please login to continue",
      })
      throw new Error("No JWT token found")
    }
    return token
  }

  // Authorized fetch wrapper
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken()
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error: Unable to connect to server")
      }
      throw error
    }
  }

  // Fetch expenses from API
  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const data = await authFetch(`${API_URL}/get-all-expenses`)
      const expenseData = Array.isArray(data) ? data : data.expenses || []
      setExpenses(expenseData)
    } catch (error) {
      console.error("Failed to fetch expenses:", error)
      addNotification({
        type: "error",
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to fetch expenses",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const expenseData = {
        title: formData.title,
        description: formData.description,
        amount: Number.parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }

      if (editingExpense) {
        await authFetch(`${API_URL}/update-expense/${editingExpense.id}`, {
          method: "PUT",
          body: JSON.stringify(expenseData),
        })
        setExpenses((prev) =>
          prev.map((expense) =>
            expense.id === editingExpense.id
              ? { ...expense, ...expenseData, updatedAt: new Date().toISOString() }
              : expense,
          ),
        )
        addNotification({
          type: "success",
          title: "Success",
          message: "Expense updated successfully",
        })
      } else {
        const response = await authFetch(`${API_URL}/create-expense`, {
          method: "POST",
          body: JSON.stringify(expenseData),
        })
        const newExpense = {
          ...expenseData,
          id: response.id || Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setExpenses((prev) => [newExpense, ...prev])
        addNotification({
          type: "success",
          title: "Success",
          message: "Expense added successfully",
        })
      }

      setIsModalVisible(false)
      setEditingExpense(null)
      resetForm()
    } catch (error) {
      console.error("Operation failed:", error)
      addNotification({
        type: "error",
        title: "Error",
        message: error instanceof Error ? error.message : "Operation failed",
      })
    }
  }

  // Handle expense deletion
  const handleDelete = async (id: number) => {
    setDeleteLoading(id)
    try {
      await authFetch(`${API_URL}/delete-expense/${id}`, {
        method: "DELETE",
      })

      const updatedExpenses = expenses.filter((expense) => expense.id !== id)
      setExpenses(updatedExpenses)

      addNotification({
        type: "success",
        title: "Success",
        message: "Expense deleted successfully",
      })
    } catch (error) {
      console.error("Delete failed:", error)
      addNotification({
        type: "error",
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to delete expense",
      })
    } finally {
      setDeleteLoading(null)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      amount: "",
      category: "Software & Tools",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "Credit Card",
      isRecurring: false,
      recurringFrequency: "monthly",
      tags: "",
    })
  }

  // Edit expense
  const editExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      title: expense.title,
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      isRecurring: expense.isRecurring,
      recurringFrequency: expense.recurringFrequency || "monthly",
      tags: expense.tags.join(", "),
    })
    setIsModalVisible(true)
  }

  // Export to CSV
  const exportToCSV = () => {
    if (filteredExpenses.length === 0) {
      addNotification({
        type: "warning",
        title: "No Data",
        message: "There are no expenses to export",
      })
      return
    }

    const headers = ["Title", "Description", "Amount", "Category", "Date", "Payment Method", "Tags"]
    const csvContent = [
      headers.join(","),
      ...filteredExpenses.map((expense) =>
        [
          expense.title,
          expense.description,
          expense.amount,
          expense.category,
          expense.date,
          expense.paymentMethod,
          expense.tags.join("; "),
        ]
          .map((field) => `"${field?.toString().replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `expenses_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Filter and sort expenses
  const filteredExpenses = React.useMemo(() => {
    const filtered = expenses.filter((expense) => {
      const matchesSearch =
        expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCategory = categoryFilter === "All" || expense.category === categoryFilter

      const matchesDate = (() => {
        if (dateFilter === "All") return true
        const expenseDate = new Date(expense.date)
        const now = new Date()

        switch (dateFilter) {
          case "This Month":
            return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
          case "Last Month":
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
            return (
              expenseDate.getMonth() === lastMonth.getMonth() && expenseDate.getFullYear() === lastMonth.getFullYear()
            )
          case "This Year":
            return expenseDate.getFullYear() === now.getFullYear()
          default:
            return true
        }
      })()

      return matchesSearch && matchesCategory && matchesDate
    })

    // Sort expenses
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case "date":
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case "amount":
          aValue = a.amount
          bValue = b.amount
          break
        case "title":
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case "category":
          aValue = a.category.toLowerCase()
          bValue = b.category.toLowerCase()
          break
        default:
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [expenses, searchTerm, categoryFilter, dateFilter, sortBy, sortOrder])

  if (loading) {
    return (
      <div className="p-6 space-y-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded-lg w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded-lg w-96 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>

        <CardSkeleton className="h-32" />
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Expense Management</h1>
          <p className="text-gray-600">Track and manage your business expenses efficiently</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={exportToCSV}
            disabled={filteredExpenses.length === 0}
            variant="outline"
            icon={<span>📊</span>}
          >
            Export CSV
          </Button>
          <Button onClick={() => setIsModalVisible(true)} icon={<span>➕</span>}>
            Add Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            label="Search"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<span>🔍</span>}
          />
          <Select
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: "All", label: "All Categories" },
              ...EXPENSE_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
            ]}
          />
          <Select
            label="Date Range"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            options={[
              { value: "All", label: "All Time" },
              { value: "This Month", label: "This Month" },
              { value: "Last Month", label: "Last Month" },
              { value: "This Year", label: "This Year" },
            ]}
          />
          <Select
            label="Sort By"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: "date", label: "Date" },
              { value: "amount", label: "Amount" },
              { value: "title", label: "Title" },
              { value: "category", label: "Category" },
            ]}
          />
          <Select
            label="Order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            options={[
              { value: "desc", label: "Descending" },
              { value: "asc", label: "Ascending" },
            ]}
          />
        </div>
        <div className="mt-4 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
          Showing {filteredExpenses.length} of {expenses.length} expenses
        </div>
      </div>

      {/* Expenses Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Expense Details</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredExpenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
                  <p className="text-gray-500 mb-4">Start tracking your business expenses</p>
                  <Button onClick={() => setIsModalVisible(true)} size="sm">
                    Add Expense
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{expense.title}</div>
                    <div className="text-sm text-gray-500">{expense.description}</div>
                    <div className="text-xs text-gray-400">
                      {expense.paymentMethod}
                      {expense.isRecurring && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          Recurring ({expense.recurringFrequency})
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-gray-900">${expense.amount.toFixed(2)}</div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {expense.category}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{new Date(expense.date).toLocaleDateString()}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {expense.tags.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    {expense.tags.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{expense.tags.length - 2}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button onClick={() => editExpense(expense)} variant="ghost" size="sm">
                      ✏️
                    </Button>
                    <Button
                      onClick={() => handleDelete(expense.id)}
                      loading={deleteLoading === expense.id}
                      variant="danger"
                      size="sm"
                    >
                      🗑️
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Add/Edit Expense Modal */}
      <Modal
        isOpen={isModalVisible}
        onClose={() => {
          setIsModalVisible(false)
          setEditingExpense(null)
          resetForm()
        }}
        title={editingExpense ? "Edit Expense" : "Add New Expense"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Expense Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Office supplies"
              required
            />
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed description of the expense"
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={EXPENSE_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            />
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Select
              label="Payment Method"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              options={PAYMENT_METHODS.map((method) => ({ value: method, label: method }))}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
              />
              <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                This is a recurring expense
              </label>
            </div>

            {formData.isRecurring && (
              <Select
                label="Recurring Frequency"
                value={formData.recurringFrequency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recurringFrequency: e.target.value as "monthly" | "quarterly" | "yearly",
                  })
                }
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "quarterly", label: "Quarterly" },
                  { value: "yearly", label: "Yearly" },
                ]}
              />
            )}
          </div>

          <Input
            label="Tags (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="business, office, supplies"
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setIsModalVisible(false)
                setEditingExpense(null)
                resetForm()
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button type="submit">{editingExpense ? "Update Expense" : "Add Expense"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
