import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const Button = ({ variant = "primary", size = "md", loading = false, icon, children, className = "", disabled, ...props }) => {
    const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 focus:ring-blue-500",
        secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500",
        danger: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 focus:ring-red-500",
        ghost: "hover:bg-gray-100 text-gray-700 focus:ring-gray-500",
        outline: "border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
    };
    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };
    return (_jsxs("button", { className: `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`, disabled: disabled || loading, ...props, children: [loading && _jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" }), icon && !loading && _jsx("span", { className: "mr-2", children: icon }), children] }));
};
