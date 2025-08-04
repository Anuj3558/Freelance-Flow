"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Dashboard from "../components/Dashboard";
import Clients from "../components/Clients";
import EstimateGenerator from "../components/EstimateGenerator";
import PaymentTracking from "../components/PaymentTracking";
import Login from "../components/Login";
import Cookies from "js-cookie";
import { useNotification } from "../components/ui/notification";
import ExpenseManagement from "../components/Expenses";
export default function Home() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [user, setUser] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { addNotification } = useNotification();
    const tabs = [
        { id: "dashboard", name: "Dashboard", icon: "📊", shortName: "Dash" },
        { id: "clients", name: "Clients", icon: "👤", shortName: "Clients" },
        { id: "estimates", name: "Estimate Generator", icon: "🧮", shortName: "Estimates" },
        { id: "payments", name: "Payment Tracking", icon: "💰", shortName: "Payments" },
        { id: "expenses", name: "Expense", icon: "💰", shortName: "expenses" },
    ];
    const handleLogin = (userData) => {
        setUser(userData);
    };
    const handleLogout = () => {
        // Clear user state and remove token first     
        addNotification({
            type: "success",
            title: "Logout!",
            message: " Logged out Successful .",
        });
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
                return _jsx(Dashboard, {});
            case "clients":
                return _jsx(Clients, {});
            case "estimates":
                return _jsx(EstimateGenerator, {});
            case "payments":
                return _jsx(PaymentTracking, {});
            case "expenses":
                return _jsx(ExpenseManagement, {});
            default:
                return _jsx(Dashboard, {});
        }
    };
    if (!user) {
        return _jsx(Login, { onLogin: handleLogin });
    }
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50", children: [_jsxs("header", { className: "bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 sticky top-0 z-50", children: [_jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex justify-between items-center h-16", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg", children: _jsx("span", { className: "text-white font-bold text-lg", children: "F" }) }), _jsxs("div", { className: "hidden sm:block", children: [_jsx("h1", { className: "text-2xl font-black text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent", children: "FreelanceFlow" }), _jsx("span", { className: "text-xs text-gray-500 font-medium", children: "Smart Business Dashboard" })] }), _jsx("div", { className: "sm:hidden", children: _jsx("h1", { className: "text-xl font-black text-gray-900", children: "FF" }) })] }), _jsxs("div", { className: "hidden md:flex items-center space-x-4", children: [_jsxs("div", { className: "flex items-center space-x-3 bg-gray-50 rounded-full px-4 py-2", children: [_jsx("div", { className: "w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md", children: user?.name.charAt(0).toUpperCase() }), _jsxs("div", { className: "hidden lg:block", children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "Welcome back," }), _jsx("p", { className: "text-xs text-gray-500", children: user?.name })] })] }), _jsx("button", { onClick: handleLogout, className: "px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200", children: "Logout" })] }), _jsx("button", { onClick: () => setIsMobileMenuOpen(!isMobileMenuOpen), className: "md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors", children: _jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: isMobileMenuOpen ? (_jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })) : (_jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" })) }) })] }) }), isMobileMenuOpen && (_jsx("div", { className: "md:hidden bg-white border-t border-gray-200 shadow-lg", children: _jsxs("div", { className: "px-4 py-3 space-y-3", children: [_jsxs("div", { className: "flex items-center space-x-3 pb-3 border-b border-gray-100", children: [_jsx("div", { className: "w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold", children: user?.name.charAt(0).toUpperCase() }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: user?.name }), _jsx("p", { className: "text-xs text-gray-500", children: user?.email })] })] }), _jsx("button", { onClick: handleLogout, className: "w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors", children: "Logout" })] }) }))] }), _jsx("nav", { className: "bg-white/60 backdrop-blur-xl shadow-sm sticky top-16 z-40", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [_jsx("div", { className: "hidden md:flex space-x-1", children: tabs.map((tab) => (_jsxs("button", { onClick: () => setActiveTab(tab.id), className: `relative py-4 px-6 font-medium text-sm transition-all duration-300 rounded-t-lg group ${activeTab === tab.id
                                    ? "text-blue-600 bg-white shadow-sm"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-white/50"}`, children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-lg", children: tab.icon }), _jsx("span", { children: tab.name })] }), activeTab === tab.id && (_jsx("div", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" }))] }, tab.id))) }), _jsx("div", { className: "md:hidden overflow-x-auto scrollbar-hide", children: _jsx("div", { className: "flex space-x-1 py-2 min-w-max", children: tabs.map((tab) => (_jsxs("button", { onClick: () => setActiveTab(tab.id), className: `relative py-3 px-4 font-medium text-xs transition-all duration-200 rounded-lg whitespace-nowrap ${activeTab === tab.id
                                        ? "text-blue-600 bg-blue-50 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`, children: [_jsxs("div", { className: "flex flex-col items-center space-y-1", children: [_jsx("span", { className: "text-base", children: tab.icon }), _jsx("span", { children: tab.shortName })] }), activeTab === tab.id && (_jsx("div", { className: "absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" }))] }, tab.id))) }) })] }) }), _jsx("main", { className: "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8", children: _jsx("div", { className: "bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 min-h-[calc(100vh-200px)] p-6", children: renderContent() }) }), _jsx("div", { className: "md:hidden fixed bottom-6 right-6 z-50", children: _jsx("button", { className: "w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center", children: _jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v16m8-8H4" }) }) }) }), _jsx("style", { children: `
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      ` })] }));
}
