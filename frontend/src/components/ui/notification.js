"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircleIcon, ExclamationCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon, } from "@heroicons/react/24/outline";
const NotificationContext = createContext(undefined);
export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
};
export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const addNotification = useCallback((notification) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newNotification = { ...notification, id };
        setNotifications((prev) => [...prev, newNotification]);
        // Auto remove after duration
        setTimeout(() => {
            removeNotification(id);
        }, notification.duration || 5000);
    }, []);
    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);
    return (_jsxs(NotificationContext.Provider, { value: { notifications, addNotification, removeNotification }, children: [children, _jsx(NotificationContainer, {})] }));
};
const NotificationContainer = () => {
    const { notifications, removeNotification } = useNotification();
    const getIcon = (type) => {
        switch (type) {
            case "success":
                return _jsx(CheckCircleIcon, { className: "h-6 w-6 text-green-400" });
            case "error":
                return _jsx(XCircleIcon, { className: "h-6 w-6 text-red-400" });
            case "warning":
                return _jsx(ExclamationCircleIcon, { className: "h-6 w-6 text-yellow-400" });
            case "info":
                return _jsx(InformationCircleIcon, { className: "h-6 w-6 text-blue-400" });
        }
    };
    const getColors = (type) => {
        switch (type) {
            case "success":
                return "bg-green-50 border-green-200";
            case "error":
                return "bg-red-50 border-red-200";
            case "warning":
                return "bg-yellow-50 border-yellow-200";
            case "info":
                return "bg-blue-50 border-blue-200";
        }
    };
    return (_jsx("div", { className: "fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full", children: notifications.map((notification) => (_jsx("div", { className: `${getColors(notification.type)} border rounded-lg p-4 shadow-lg transform transition-all duration-300 ease-in-out animate-slide-in`, children: _jsxs("div", { className: "flex items-start", children: [_jsx("div", { className: "flex-shrink-0", children: getIcon(notification.type) }), _jsxs("div", { className: "ml-3 flex-1", children: [_jsx("h3", { className: "text-sm font-medium text-gray-900", children: notification.title }), _jsx("p", { className: "mt-1 text-sm text-gray-600", children: notification.message })] }), _jsx("div", { className: "ml-4 flex-shrink-0", children: _jsx("button", { onClick: () => removeNotification(notification.id), className: "inline-flex text-gray-400 hover:text-gray-600 focus:outline-none", children: _jsx(XMarkIcon, { className: "h-5 w-5" }) }) })] }) }, notification.id))) }));
};
