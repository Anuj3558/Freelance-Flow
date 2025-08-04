"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Line, Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, } from "chart.js";
import Cookies from "js-cookie";
import { useNotification } from "./ui/notification";
import { CardSkeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Modal } from "./ui/modal";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);
export default function Dashboard() {
    const { addNotification } = useNotification();
    const [stats, setStats] = useState({
        totalClients: 0,
        activeClients: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        activeProjects: 0,
        completedProjects: 0,
    });
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showMilestones, setShowMilestones] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updatingMilestone, setUpdatingMilestone] = useState(null);
    const [revenueData, setRevenueData] = useState([]);
    const [expenseData, setExpenseData] = useState([]);
    // API URLs
    const API_URL = "http://localhost:5000/api";
    const ANALYTICS_API_URL = `${API_URL}/analytics`;
    const MILESTONES_API_URL = `${API_URL}/milestones`;
    // Get JWT token from cookies
    const getAuthToken = () => {
        const token = Cookies.get("jwt_token");
        if (!token) {
            addNotification({
                type: "error",
                title: "Authentication Error",
                message: "No JWT token found",
            });
            return null;
        }
        return token;
    };
    // Authorized fetch wrapper
    const authFetch = async (url, options = {}) => {
        const token = getAuthToken();
        if (!token) {
            throw new Error("No authentication token");
        }
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            if (error instanceof TypeError && error.message.includes("fetch")) {
                throw new Error("Network error: Unable to connect to server");
            }
            throw error;
        }
    };
    // Fetch dashboard analytics
    const fetchDashboardAnalytics = async () => {
        try {
            const [statsResponse, revenueResponse, expensesResponse] = await Promise.all([
                authFetch(`${ANALYTICS_API_URL}/dashboard-stats`),
                authFetch(`${ANALYTICS_API_URL}/revenue-over-time`),
                authFetch(`${ANALYTICS_API_URL}/expense-breakdown`),
            ]);
            if (statsResponse.success) {
                setStats(statsResponse?.data[0]);
            }
            if (revenueResponse.success) {
                setRevenueData(revenueResponse.data);
            }
            if (expensesResponse.success) {
                setExpenseData(expensesResponse.data);
            }
        }
        catch (error) {
            console.error("Error fetching analytics:", error);
            // Fallback to default data if backend is not available
            setRevenueData([
                { month: "Jan", revenue: 12000, expenses: 800 },
                { month: "Feb", revenue: 15000, expenses: 900 },
                { month: "Mar", revenue: 8000, expenses: 700 },
                { month: "Apr", revenue: 18000, expenses: 1000 },
                { month: "May", revenue: 22000, expenses: 1200 },
                { month: "Jun", revenue: 25000, expenses: 1100 },
            ]);
            setExpenseData([
                { category: "Software", amount: 800 },
                { category: "Tools", amount: 400 },
                { category: "Marketing", amount: 300 },
                { category: "Office", amount: 500 },
                { category: "Other", amount: 200 },
            ]);
        }
    };
    // Fetch projects with milestones
    const fetchProjectsWithMilestones = async () => {
        try {
            const response = await authFetch(`${MILESTONES_API_URL}/get-client-milestones`);
            if (response.success) {
                const activeProjects = response?.data?.filter((project) => {
                    if (!project.milestones || project.milestones.length === 0)
                        return false;
                    return true;
                });
                setProjects(activeProjects);
            }
        }
        catch (error) {
            console.error("Error fetching projects with milestones:", error);
            setProjects([]);
        }
    };
    // Mark milestone as achieved
    const markMilestoneAsAchieved = async (milestoneId) => {
        setUpdatingMilestone(milestoneId);
        try {
            const response = await authFetch(`${MILESTONES_API_URL}/achieve-milestone/${milestoneId}`, {
                method: "PUT",
                body: JSON.stringify({
                    isAchieved: true,
                    achievedDate: new Date().toISOString(),
                    status: "Achieved",
                }),
            });
            if (response.success) {
                // Update local state
                setProjects((prevProjects) => prevProjects.map((project) => ({
                    ...project,
                    milestones: project.milestones.map((milestone) => milestone._id === milestoneId || milestone.id === milestoneId
                        ? {
                            ...milestone,
                            status: "Achieved",
                            isAchieved: true,
                            achievedDate: new Date().toISOString(),
                        }
                        : milestone),
                })));
                if (selectedProject) {
                    setSelectedProject((prev) => prev
                        ? {
                            ...prev,
                            milestones: prev.milestones.map((milestone) => milestone._id === milestoneId || milestone.id === milestoneId
                                ? {
                                    ...milestone,
                                    status: "Achieved",
                                    isAchieved: true,
                                    achievedDate: new Date().toISOString(),
                                }
                                : milestone),
                        }
                        : null);
                }
                addNotification({
                    type: "success",
                    title: "Milestone Achieved",
                    message: "Milestone has been marked as achieved successfully.",
                });
            }
        }
        catch (error) {
            console.error("Error marking milestone as achieved:", error);
            addNotification({
                type: "error",
                title: "Update Failed",
                message: `Failed to update milestone: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
        finally {
            setUpdatingMilestone(null);
        }
    };
    // Load project milestones
    const loadProjectMilestones = (project) => {
        setSelectedProject(project);
        setShowMilestones(true);
    };
    // Calculate milestone status
    const getMilestoneStatus = (milestone) => {
        if (milestone.isAchieved || milestone.status === "Achieved") {
            return "Achieved";
        }
        const dueDate = new Date(milestone.dueDate);
        const currentDate = new Date();
        if (currentDate > dueDate) {
            return "Overdue";
        }
        return "Pending";
    };
    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case "Achieved":
                return "bg-green-50 text-green-700 border-green-200";
            case "Overdue":
                return "bg-red-50 text-red-700 border-red-200";
            case "Pending":
                return "bg-yellow-50 text-yellow-700 border-yellow-200";
            default:
                return "bg-gray-50 text-gray-700 border-gray-200";
        }
    };
    // Load data on component mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchDashboardAnalytics(), fetchProjectsWithMilestones()]);
            }
            catch (error) {
                console.error("Error loading dashboard data:", error);
            }
            finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);
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
    };
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
    };
    if (loading) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [1, 2, 3, 4].map((i) => (_jsx(CardSkeleton, {}, i))) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsx(CardSkeleton, { className: "h-80" }), _jsx(CardSkeleton, { className: "h-80" })] }), _jsx(CardSkeleton, { className: "h-96" })] }));
    }
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "p-3 bg-slate-100 rounded-lg", children: _jsx("span", { className: "text-2xl", children: "\uD83D\uDC65" }) }), _jsxs("div", { className: "ml-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Total Clients" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats?.totalClients })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "p-3 bg-green-100 rounded-lg", children: _jsx("span", { className: "text-2xl", children: "\u2705" }) }), _jsxs("div", { className: "ml-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Active Clients" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats?.activeClients })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "p-3 bg-blue-100 rounded-lg", children: _jsx("span", { className: "text-2xl", children: "\uD83D\uDCB0" }) }), _jsxs("div", { className: "ml-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Total Revenue" }), _jsxs("p", { className: "text-2xl font-bold text-gray-900", children: ["\u20B9", stats?.totalRevenue] })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "p-3 bg-red-100 rounded-lg", children: _jsx("span", { className: "text-2xl", children: "\uD83D\uDCCA" }) }), _jsxs("div", { className: "ml-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Total Expenses" }), _jsxs("p", { className: "text-2xl font-bold text-gray-900", children: ["\u20B9", stats?.totalExpenses] })] })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Revenue & Expenses" }), _jsx("div", { className: "h-64", children: _jsx(Line, { data: revenueChartData }) })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Expense Breakdown" }), _jsx("div", { className: "h-64", children: _jsx(Bar, { data: expenseChartData }) })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden", children: [_jsxs("div", { className: "px-6 py-4 border-b border-gray-200 bg-gray-50", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Active Projects" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Projects currently in progress with milestone tracking" })] }), projects.length === 0 ? (_jsxs("div", { className: "p-12 text-center text-gray-500", children: [_jsx("div", { className: "w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center", children: _jsx("span", { className: "text-2xl", children: "\uD83D\uDCCB" }) }), _jsx("p", { className: "text-lg font-medium", children: "No active projects found" }), _jsx("p", { className: "text-sm mt-1", children: "Create projects with milestones to track progress here." })] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Project Details" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Client" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Total Value" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Timeline" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Progress" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Actions" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: projects.map((project) => {
                                        const achievedMilestones = project.milestones.filter((m) => m.isAchived || m.status === "Achieved").length;
                                        const totalMilestones = project.milestones.length;
                                        const progressPercentage = totalMilestones > 0 ? (achievedMilestones / totalMilestones) * 100 : 0;
                                        const totalAmount = project.milestones.reduce((sum, milestone) => sum + (milestone.amount ? milestone.amount : 0), 0);
                                        return (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-900", children: project.name }), _jsx("div", { className: "text-sm text-gray-500 truncate max-w-xs", children: project.description }), project.estimateName && (_jsx("div", { className: "text-xs text-blue-600 font-medium mt-1", children: project.estimateName }))] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900", children: project.clientName }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900", children: ["\u20B9", totalAmount.toLocaleString()] }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: _jsxs("div", { children: [_jsxs("div", { children: ["Start: ", new Date(project.startDate).toLocaleDateString()] }), _jsxs("div", { children: ["End: ", new Date(project.endDate).toLocaleDateString()] })] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("div", { className: "flex items-center", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center justify-between text-xs mb-2", children: [_jsxs("span", { className: "text-gray-600 font-medium", children: [achievedMilestones, "/", totalMilestones, " milestones"] }), _jsxs("span", { className: "text-gray-600 font-semibold", children: [Math.round(progressPercentage), "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-slate-600 h-2 rounded-full transition-all duration-300", style: { width: `${progressPercentage}%` } }) })] }) }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium", children: _jsx(Button, { onClick: () => loadProjectMilestones(project), variant: "outline", size: "sm", children: "View Milestones" }) })] }, project._id || project.id));
                                    }) })] }) }))] }), _jsx(Modal, { isOpen: showMilestones, onClose: () => setShowMilestones(false), title: selectedProject ? `Milestones for ${selectedProject.name}` : "", size: "xl", children: selectedProject && (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "Client:" }), _jsx("span", { className: "ml-2 text-gray-900", children: selectedProject.clientName })] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "Total Value:" }), _jsxs("span", { className: "ml-2 text-gray-900 font-semibold", children: ["\u20B9", selectedProject.milestones
                                                        .reduce((sum, milestone) => sum + (milestone.amount ? milestone.amount : 0), 0)
                                                        .toLocaleString()] })] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "Timeline:" }), _jsxs("span", { className: "ml-2 text-gray-900", children: [new Date(selectedProject.startDate).toLocaleDateString(), " -", " ", new Date(selectedProject.endDate).toLocaleDateString()] })] })] }) }), _jsx("div", { className: "space-y-4 max-h-96 overflow-y-auto", children: selectedProject.milestones
                                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                                .map((milestone) => {
                                const status = milestone.isAchived ? "Achieved" : getMilestoneStatus(milestone);
                                const isUpdating = updatingMilestone === (milestone._id || milestone.id);
                                return (_jsxs("div", { className: "border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h4", { className: "font-medium text-gray-900 text-lg", children: milestone.name }), _jsx("p", { className: "text-sm text-gray-600 mt-2", children: milestone.description })] }), _jsxs("div", { className: "text-right ml-6", children: [_jsxs("p", { className: "text-xl font-semibold text-gray-900", children: ["\u20B9", milestone.amount.toLocaleString()] }), _jsxs("p", { className: "text-sm text-gray-500", children: [milestone.percentage, "%"] })] })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("span", { className: `inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)}`, children: status }), _jsxs("span", { className: "text-sm text-gray-500", children: ["Due: ", new Date(milestone.dueDate).toLocaleDateString()] }), milestone.achievedDate && (_jsxs("span", { className: "text-sm text-green-600 font-medium", children: ["Achieved: ", new Date(milestone.achievedDate).toLocaleDateString()] }))] }), !milestone.isAchived && (_jsx(Button, { onClick: () => markMilestoneAsAchieved(milestone._id || milestone.id), loading: isUpdating, variant: "primary", size: "sm", children: "Mark Achieved" }))] })] }, milestone._id || milestone.id));
                            }) }), _jsx("div", { className: "flex justify-end pt-4 border-t border-gray-200", children: _jsx(Button, { onClick: () => setShowMilestones(false), variant: "secondary", children: "Close" }) })] })) })] }));
}
