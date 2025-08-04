import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../../lib/utils";
export const Table = ({ children, className }) => (_jsx("div", { className: cn("bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden", className), children: _jsx("div", { className: "overflow-x-auto", children: _jsx("table", { className: "min-w-full divide-y divide-gray-200", children: children }) }) }));
export const TableHeader = ({ children }) => (_jsx("thead", { className: "bg-gray-50", children: children }));
export const TableBody = ({ children }) => (_jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: children }));
export const TableRow = ({ children, className }) => (_jsx("tr", { className: cn("hover:bg-gray-50 transition-colors", className), children: children }));
export const TableHead = ({ children, className }) => (_jsx("th", { className: cn("px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider", className), children: children }));
export const TableCell = ({ children, className }) => (_jsx("td", { className: cn("px-6 py-4 whitespace-nowrap text-sm text-gray-900", className), children: children }));
