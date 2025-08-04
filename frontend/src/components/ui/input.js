import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const Input = ({ label, error, icon, className = "", ...props }) => {
    return (_jsxs("div", { className: "space-y-1", children: [label && _jsx("label", { className: "block text-sm font-medium text-gray-700", children: label }), _jsxs("div", { className: "relative", children: [icon && _jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: icon }), _jsx("input", { className: `
            w-full px-4 py-3 border border-gray-200 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-all duration-200 bg-white/80 backdrop-blur-sm
            shadow-sm hover:shadow-md placeholder-gray-400
            ${icon ? "pl-10" : ""}
            ${error ? "border-red-300 focus:ring-red-500" : ""}
            ${className}
          `, ...props })] }), error && _jsx("p", { className: "text-sm text-red-600", children: error })] }));
};
export const TextArea = ({ label, error, className = "", ...props }) => {
    return (_jsxs("div", { className: "space-y-1", children: [label && _jsx("label", { className: "block text-sm font-medium text-gray-700", children: label }), _jsx("textarea", { className: `
          w-full px-4 py-3 border border-gray-200 rounded-xl
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200 bg-white/80 backdrop-blur-sm
          shadow-sm hover:shadow-md placeholder-gray-400 resize-none
          ${error ? "border-red-300 focus:ring-red-500" : ""}
          ${className}
        `, ...props }), error && _jsx("p", { className: "text-sm text-red-600", children: error })] }));
};
