"use client"

import { useState, useEffect } from "react"
import { Line, Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import Cookies from "js-cookie"
import { useNotification } from "./ui/notification"
import { CardSkeleton } from "./ui/skeleton"
import { Button } from "./ui/button"
import { Modal } from "./ui/modal"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

interface DashboardStats {
  totalClients: number
  activeClients: number
  totalRevenue: number
  totalExpenses: number
  activeProjects: number
  completedProjects: number
}

interface Milestone {
  _id: string
  id?: string
  name: string
  description: string
  percentage: number
  amount: number
  dueDate: string
  status: "Pending" | "Achieved" | "Overdue"
  projectId: string
  clientId: string
  estimateId: string
  isAchived: boolean
  achievedDate?: string
}

interface ProjectWithMilestones {
  _id: string
  id?: string
  name: string
  description: string
  clientName: string
  clientId: string
  status: string
  totalAmount: number
  startDate: string
  endDate: string
  milestones: Milestone[]
  estimateName?: string
  createdAt: string
}

interface RevenueData {
  month: string
  revenue: number
  expenses: number
}

interface ExpenseBreakdown {
  category: string
  amount: number
}

export default function Dashboard() {
  const { addNotification } = useNotification()
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    activeProjects: 0,
    completedProjects: 0,
  })

  const [projects, setProjects] = useState<ProjectWithMilestones[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectWithMilestones | null>(null)
  const [showMilestones, setShowMilestones] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatingMilestone, setUpdatingMilestone] = useState<string | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [expenseData, setExpenseData] = useState<ExpenseBreakdown[]>([])

  // API URLs
  const API_URL = "http://localhost:5000/api"
  const ANALYTICS_API_URL = `${API_URL}/analytics`
  const MILESTONES_API_URL = `${API_URL}/milestones`

  // Get JWT token from cookies
  const getAuthToken = () => {
    const token = Cookies.get("jwt_token")
    if (!token) {
      addNotification({
        type: "error",
        title: "Authentication Error",
        message: "No JWT token found",
      })
      return null
    }
    return token
  }

  // Authorized fetch wrapper
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token")
    }

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

  // Fetch dashboard analytics
  const fetchDashboardAnalytics = async () => {
    try {
      const [statsResponse, revenueResponse, expensesResponse] = await Promise.all([
        authFetch(`${ANALYTICS_API_URL}/dashboard-stats`),
        authFetch(`${ANALYTICS_API_URL}/revenue-over-time`),
        authFetch(`${ANALYTICS_API_URL}/expense-breakdown`),
      ])

      if (statsResponse.success) {
        setStats(statsResponse?.data[0])
      }

      if (revenueResponse.success) {
        setRevenueData(revenueResponse.data)
      }

      if (expensesResponse.success) {
        setExpenseData(expensesResponse.data)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
      // Fallback to default data if backend is not available
      setRevenueData([
        { month: "Jan", revenue: 12000, expenses: 800 },
        { month: "Feb", revenue: 15000, expenses: 900 },
        { month: "Mar", revenue: 8000, expenses: 700 },
        { month: "Apr", revenue: 18000, expenses: 1000 },
        { month: "May", revenue: 22000, expenses: 1200 },
        { month: "Jun", revenue: 25000, expenses: 1100 },
      ])
      setExpenseData([
        { category: "Software", amount: 800 },
        { category: "Tools", amount: 400 },
        { category: "Marketing", amount: 300 },
        { category: "Office", amount: 500 },
        { category: "Other", amount: 200 },
      ])
    }
  }

  // Fetch projects with milestones
  const fetchProjectsWithMilestones = async () => {
    try {
      const response = await authFetch(`${MILESTONES_API_URL}/get-client-milestones`)
      if (response.success) {
        const activeProjects = response?.data?.filter((project: ProjectWithMilestones) => {
          if (!project.milestones || project.milestones.length === 0) return false
          return true
        })
        setProjects(activeProjects)
      }
    } catch (error) {
      console.error("Error fetching projects with milestones:", error)
      setProjects([])
    }
  }

  // Mark milestone as achieved
  const markMilestoneAsAchieved = async (milestoneId: string) => {
    setUpdatingMilestone(milestoneId)
    try {
      const response = await authFetch(`${MILESTONES_API_URL}/achieve-milestone/${milestoneId}`, {
        method: "PUT",
        body: JSON.stringify({
          isAchieved: true,
          achievedDate: new Date().toISOString(),
          status: "Achieved",
        }),
      })

      if (response.success) {
        // Update local state
        setProjects((prevProjects) =>
          prevProjects.map((project) => ({
            ...project,
            milestones: project.milestones.map((milestone) =>
              milestone._id === milestoneId || milestone.id === milestoneId
                ? {
                    ...milestone,
                    status: "Achieved" as const,
                    isAchieved: true,
                    achievedDate: new Date().toISOString(),
                  }
                : milestone,
            ),
          })),
        )

        if (selectedProject) {
          setSelectedProject((prev) =>
            prev
              ? {
                  ...prev,
                  milestones: prev.milestones.map((milestone) =>
                    milestone._id === milestoneId || milestone.id === milestoneId
                      ? {
                          ...milestone,
                          status: "Achieved" as const,
                          isAchieved: true,
                          achievedDate: new Date().toISOString(),
                        }
                      : milestone,
                  ),
                }
              : null,
          )
        }

        addNotification({
          type: "success",
          title: "Milestone Achieved",
          message: "Milestone has been marked as achieved successfully.",
        })
      }
    } catch (error) {
      console.error("Error marking milestone as achieved:", error)
      addNotification({
        type: "error",
        title: "Update Failed",
        message: `Failed to update milestone: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setUpdatingMilestone(null)
    }
  }

  // Load project milestones
  const loadProjectMilestones = (project: ProjectWithMilestones) => {
    setSelectedProject(project)
    setShowMilestones(true)
  }

  // Calculate milestone status
  const getMilestoneStatus = (milestone: Milestone) => {
    if (milestone.isAchieved || milestone.status === "Achieved") {
      return "Achieved"
    }

    const dueDate = new Date(milestone.dueDate)
    const currentDate = new Date()

    if (currentDate > dueDate) {
      return "Overdue"
    }

    return "Pending"
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Achieved":
        return "bg-green-50 text-green-700 border-green-200"
      case "Overdue":
        return "bg-red-50 text-red-700 border-red-200"
      case "Pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([fetchDashboardAnalytics(), fetchProjectsWithMilestones()])
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Prepare chart data
  const revenueChartData = {
    labels: revenueData.map((item) => item.month),
    datasets: [
      {
        label: "Revenue",
        data: revenueData.map((item) => item.revenue),
        borderColor: "#1f2937",
        backgroundColor: "rgba(31, 41, 55, 0.1)",
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: "#1f2937",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: "Expenses",
        data: revenueData.map((item) => item.expenses),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: "#dc2626",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  }

  const expenseChartData = {
    labels: expenseData.map((item) => item.category),
    datasets: [
      {
        label: "Expenses",
        data: expenseData.map((item) => item.amount),
        backgroundColor: ["#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af"],
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  }

 

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton className="h-80" />
          <CardSkeleton className="h-80" />
        </div>
        <CardSkeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-slate-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats?.totalRevenue}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats?.totalExpenses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Expenses</h3>
          <div className="h-64">
            <Line data={revenueChartData} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
          <div className="h-64">
            <Bar data={expenseChartData} />
          </div>
        </div>
      </div>

      {/* Active Projects with Milestones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Active Projects</h3>
          <p className="text-sm text-gray-600 mt-1">Projects currently in progress with milestone tracking</p>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-lg font-medium">No active projects found</p>
            <p className="text-sm mt-1">Create projects with milestones to track progress here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timeline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => {
                  const achievedMilestones = project.milestones.filter(
                    (m) => m.isAchived || m.status === "Achieved",
                  ).length
                  const totalMilestones = project.milestones.length
                  const progressPercentage = totalMilestones > 0 ? (achievedMilestones / totalMilestones) * 100 : 0
                  const totalAmount = project.milestones.reduce(
                    (sum, milestone) => sum + (milestone.amount ? milestone.amount : 0),
                    0,
                  )
                  return (
                    <tr key={project._id || project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{project.description}</div>
                          {project.estimateName && (
                            <div className="text-xs text-blue-600 font-medium mt-1">{project.estimateName}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {project.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₹{totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>Start: {new Date(project.startDate).toLocaleDateString()}</div>
                          <div>End: {new Date(project.endDate).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="text-gray-600 font-medium">
                                {achievedMilestones}/{totalMilestones} milestones
                              </span>
                              <span className="text-gray-600 font-semibold">{Math.round(progressPercentage)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-slate-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button onClick={() => loadProjectMilestones(project)} variant="outline" size="sm">
                          View Milestones
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Milestone Details Modal */}
      <Modal
        isOpen={showMilestones}
        onClose={() => setShowMilestones(false)}
        title={selectedProject ? `Milestones for ${selectedProject.name}` : ""}
        size="xl"
      >
        {selectedProject && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Client:</span>
                  <span className="ml-2 text-gray-900">{selectedProject.clientName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total Value:</span>
                  <span className="ml-2 text-gray-900 font-semibold">
                    ₹
                    {selectedProject.milestones
                      .reduce((sum, milestone) => sum + (milestone.amount ? milestone.amount : 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Timeline:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(selectedProject.startDate).toLocaleDateString()} -{" "}
                    {new Date(selectedProject.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {selectedProject.milestones
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map((milestone) => {
                  const status = milestone.isAchived ? "Achieved" : getMilestoneStatus(milestone)
                  const isUpdating = updatingMilestone === (milestone._id || milestone.id)

                  return (
                    <div
                      key={milestone._id || milestone.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-lg">{milestone.name}</h4>
                          <p className="text-sm text-gray-600 mt-2">{milestone.description}</p>
                        </div>
                        <div className="text-right ml-6">
                          <p className="text-xl font-semibold text-gray-900">₹{milestone.amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">{milestone.percentage}%</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)}`}
                          >
                            {status}
                          </span>
                          <span className="text-sm text-gray-500">
                            Due: {new Date(milestone.dueDate).toLocaleDateString()}
                          </span>
                          {milestone.achievedDate && (
                            <span className="text-sm text-green-600 font-medium">
                              Achieved: {new Date(milestone.achievedDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {!milestone.isAchived && (
                          <Button
                            onClick={() => markMilestoneAsAchieved(milestone._id || milestone.id!)}
                            loading={isUpdating}
                            variant="primary"
                            size="sm"
                          >
                            Mark Achieved
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button onClick={() => setShowMilestones(false)} variant="secondary">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
