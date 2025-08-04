"use client"

import { useState } from "react"
import Dashboard from "../components/Dashboard"
import Clients from "../components/Clients"
import EstimateGenerator from "../components/EstimateGenerator"
import PaymentTracking from "../components/PaymentTracking"
import Login from "../components/Login"
import Cookies from "js-cookie"
import { useNotification } from "../components/ui/notification"
import ExpenseManagement from "../components/Expenses"

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { addNotification } = useNotification()

  const tabs = [
    { id: "dashboard", name: "Dashboard", icon: "📊", shortName: "Dash" },
    { id: "clients", name: "Clients", icon: "👤", shortName: "Clients" },
    { id: "estimates", name: "Estimate Generator", icon: "🧮", shortName: "Estimates" },
    { id: "payments", name: "Payment Tracking", icon: "💰", shortName: "Payments" },
    { id: "expenses", name: "Expense", icon: "💰", shortName: "expenses" },
  ]

  const handleLogin = (userData: { name: string; email: string }) => {
    setUser(userData)
  }

  const handleLogout = () => {
    // Clear user state and remove token first     
    addNotification({
            type: "success",
            title: "Logout!",
            message: " Logged out Successful .",
          })
      setUser(null);
      Cookies.remove("jwt_token", { path: "/" });
    
    // Show success notification      
    // If you need to redirect after logout, you can add:
    // setTimeout(() => {
    //   window.location.href = '/login'; // or use your router's navigation method
    // }, 1000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />
      case "clients":
        return <Clients />
      case "estimates":
        return <EstimateGenerator />
      case "payments":
        return <PaymentTracking />
      case "expenses":
        return <ExpenseManagement />
      default:
        return <Dashboard />
    }
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-black text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  FreelanceFlow
                </h1>
                <span className="text-xs text-gray-500 font-medium">Smart Business Dashboard</span>
              </div>
              <div className="sm:hidden">
                <h1 className="text-xl font-black text-gray-900">FF</h1>
              </div>
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-gray-50 rounded-full px-4 py-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-900">Welcome back,</p>
                  <p className="text-xs text-gray-500">{user?.name}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white/60 backdrop-blur-xl shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-4 px-6 font-medium text-sm transition-all duration-300 rounded-t-lg group ${
                  activeTab === tab.id
                    ? "text-blue-600 bg-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.name}</span>
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden overflow-x-auto scrollbar-hide">
            <div className="flex space-x-1 py-2 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-3 px-4 font-medium text-xs transition-all duration-200 rounded-lg whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-blue-600 bg-blue-50 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-base">{tab.icon}</span>
                    <span>{tab.shortName}</span>
                  </div>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 min-h-[calc(100vh-200px)] p-6">
          {renderContent()}
        </div>
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <button className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <style >{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}