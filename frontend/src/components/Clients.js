"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { useNotification } from "./ui/notification";
import { Button } from "./ui/button";
import { Input, TextArea } from "./ui/input";
import { Select } from "./ui/select";
import { Modal } from "./ui/modal";
import { CardSkeleton, TableSkeleton } from "./ui/skeleton";
const API_URL = "http://localhost:5000/api/clients";
export default function ClientManagement() {
    const { addNotification } = useNotification();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isClientDetailVisible, setIsClientDetailVisible] = useState(false);
    const [isProjectModalVisible, setIsProjectModalVisible] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [deleteLoading, setDeleteLoading] = useState(null);
    const [projectSubmitLoading, setProjectSubmitLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        company: "",
        status: "Active",
        notes: "",
    });
    const [projectFormData, setProjectFormData] = useState({
        name: "",
        description: "",
        status: "Active",
    });
    // Helper to safely get clients array
    const getSafeClients = () => (Array.isArray(clients) ? clients : []);
    // Get JWT token from cookies
    const getAuthToken = () => {
        const token = Cookies.get("jwt_token");
        if (!token) {
            addNotification({
                type: "error",
                title: "Authentication Error",
                message: "Please login to continue",
            });
            throw new Error("No JWT token found");
        }
        return token;
    };
    // Authorized fetch wrapper
    const authFetch = async (url, options = {}) => {
        const token = getAuthToken();
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
    // Fetch clients from API
    const fetchClients = async () => {
        setLoading(true);
        try {
            const data = await authFetch(API_URL + "/get-all-clients");
            const enrichedData = Array.isArray(data)
                ? data.map((client) => ({
                    ...client,
                    projectsList: client.projectsList || [],
                }))
                : [];
            setClients(enrichedData);
        }
        catch (error) {
            console.error("Failed to fetch clients:", error);
            setClients([]);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchClients();
    }, []);
    // Calculate statistics
    // Filter clients based on search and status
    const filteredClients = React.useMemo(() => {
        const safeClients = getSafeClients();
        return safeClients.filter((client) => {
            if (!client)
                return false;
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = client.name?.toLowerCase().includes(searchLower) ||
                client.email?.toLowerCase().includes(searchLower) ||
                client.company?.toLowerCase().includes(searchLower);
            const matchesStatus = statusFilter === "All" || client.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [clients, searchTerm, statusFilter]);
    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingClient) {
                await authFetch(`${API_URL}/update-client/${editingClient.id}`, {
                    method: "PUT",
                    body: JSON.stringify(formData),
                });
                setClients((prevClients) => prevClients.map((c) => (c.id === editingClient.id ? { ...c, ...formData } : c)));
                addNotification({
                    type: "success",
                    title: "Success",
                    message: "Client updated successfully",
                });
            }
            else {
                const newClient = await authFetch(API_URL + "/create-client", {
                    method: "POST",
                    body: JSON.stringify({ ...formData, projects: 0 }),
                });
                setClients((prevClients) => [
                    ...prevClients,
                    {
                        ...newClient,
                        projectsList: [],
                    },
                ]);
                addNotification({
                    type: "success",
                    title: "Success",
                    message: "Client added successfully",
                });
            }
            setIsModalVisible(false);
            setEditingClient(null);
            setFormData({
                name: "",
                email: "",
                phone: "",
                company: "",
                status: "Active",
                notes: "",
            });
        }
        catch (error) {
            console.error("Operation failed:", error);
            addNotification({
                type: "error",
                title: "Error",
                message: error instanceof Error ? error.message : "Operation failed",
            });
        }
    };
    // Handle project submission
    const handleProjectSubmit = async (e) => {
        e.preventDefault();
        if (!selectedClient) {
            addNotification({
                type: "error",
                title: "Error",
                message: "No client selected",
            });
            return;
        }
        setProjectSubmitLoading(true);
        try {
            const projectData = {
                title: projectFormData.name,
                description: projectFormData.description,
                status: projectFormData.status,
                clientId: selectedClient.id,
            };
            const newProject = await authFetch(`${API_URL}/create-project/${selectedClient.id}`, {
                method: "POST",
                body: JSON.stringify(projectData),
            });
            const updateProject = {
                name: newProject.data.name,
                description: newProject.data.description,
                status: newProject.data.status,
                id: newProject.data.id,
                createdAt: newProject.data.createdAt || new Date().toISOString().split("T")[0],
            };
            const updatedClients = clients.map((c) => {
                if (c.id === selectedClient.id) {
                    return {
                        ...c,
                        projects: c.projects + 1,
                        projectsList: [...(c.projectsList || []), updateProject],
                    };
                }
                return c;
            });
            setClients(updatedClients);
            const updatedSelectedClient = {
                ...selectedClient,
                projects: selectedClient.projects + 1,
                projectsList: [...(selectedClient.projectsList || []), updateProject],
            };
            setSelectedClient(updatedSelectedClient);
            addNotification({
                type: "success",
                title: "Success",
                message: "Project added successfully",
            });
            setIsProjectModalVisible(false);
            setProjectFormData({
                name: "",
                description: "",
                status: "Active",
            });
        }
        catch (error) {
            console.error("Project creation failed:", error);
            addNotification({
                type: "error",
                title: "Error",
                message: error instanceof Error ? error.message : "Failed to create project",
            });
        }
        finally {
            setProjectSubmitLoading(false);
        }
    };
    // Handle client deletion
    const handleDelete = async (id) => {
        setDeleteLoading(id);
        try {
            await authFetch(`${API_URL}/delete-client/${id}`, {
                method: "DELETE",
            });
            setClients((prevClients) => prevClients.filter((c) => c.id !== id));
            addNotification({
                type: "success",
                title: "Success",
                message: "Client deleted successfully",
            });
            if (selectedClient?.id === id) {
                setIsClientDetailVisible(false);
                setSelectedClient(null);
            }
        }
        catch (error) {
            console.error("Delete failed:", error);
            addNotification({
                type: "error",
                title: "Error",
                message: error instanceof Error ? error.message : "Failed to delete client",
            });
        }
        finally {
            setDeleteLoading(null);
        }
    };
    // View client details
    const viewClientDetails = (client) => {
        fetchClientProjects(client.id, client);
        setIsClientDetailVisible(true);
    };
    // Export to CSV
    const exportToCSV = () => {
        if (filteredClients.length === 0) {
            addNotification({
                type: "warning",
                title: "No Data",
                message: "There are no clients to export",
            });
            return;
        }
        const headers = ["Name", "Email", "Phone", "Company", "Projects", "Status", "Notes"];
        const csvContent = [
            headers.join(","),
            ...filteredClients.map((client) => [client.name, client.email, client.phone, client.company, client.projects, client.status, client.notes]
                .map((field) => `"${field?.toString().replace(/"/g, '""')}"`)
                .join(",")),
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `clients_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };
    const deleteProject = async (projectId) => {
        try {
            await authFetch(`${API_URL}/delete-project/${projectId}`, {
                method: "DELETE",
            });
            if (selectedClient) {
                const updatedProjects = (selectedClient.projectsList || []).filter((project) => project.id !== projectId);
                setSelectedClient({
                    ...selectedClient,
                    projects: updatedProjects.length,
                    projectsList: updatedProjects,
                });
            }
            setClients((prevClients) => prevClients.map((client) => client.id === selectedClient?.id
                ? {
                    ...client,
                    projects: (client.projectsList?.length || 0) - 1,
                    projectsList: (client.projectsList || []).filter((project) => project.id !== projectId),
                }
                : client));
            addNotification({
                type: "success",
                title: "Success",
                message: "Project deleted successfully",
            });
        }
        catch (error) {
            console.error("Failed to delete project:", error);
            addNotification({
                type: "error",
                title: "Error",
                message: error instanceof Error ? error.message : "Failed to delete project",
            });
        }
    };
    const fetchClientProjects = async (clientId, currClient) => {
        try {
            const projects = await authFetch(`${API_URL}/get-client-projects/${clientId}`);
            const data = projects.data;
            const updatedSelectedClient = {
                ...currClient,
                projectsList: Array.isArray(data) ? data : [],
            };
            setSelectedClient(updatedSelectedClient);
            setClients((prevClients) => prevClients.map((client) => client.id === clientId ? { ...client, projectsList: Array.isArray(data) ? data : [] } : client));
        }
        catch (error) {
            console.error("Failed to fetch client projects:", error);
            addNotification({
                type: "error",
                title: "Error",
                message: error instanceof Error ? error.message : "Failed to fetch projects",
            });
            if (selectedClient) {
                setSelectedClient({
                    ...selectedClient,
                    projectsList: [],
                });
            }
        }
    };
    if (loading) {
        return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6", children: [1, 2, 3].map((i) => (_jsx(CardSkeleton, {}, i))) }), _jsx(CardSkeleton, { className: "h-32" }), _jsx(TableSkeleton, {})] }));
    }
    return (_jsxs("div", { className: "p-6 space-y-8", children: [_jsxs("div", { className: "flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-2", children: "Client Management" }), _jsx("p", { className: "text-gray-600", children: "Manage your clients and track their projects efficiently" })] }), _jsxs("div", { className: "flex space-x-3", children: [_jsx(Button, { onClick: exportToCSV, disabled: filteredClients.length === 0, variant: "outline", icon: _jsx("span", { children: "\uD83D\uDCCA" }), children: "Export CSV" }), _jsx(Button, { onClick: () => setIsModalVisible(true), icon: _jsx("span", { children: "\u2795" }), children: "Add Client" })] })] }), _jsx("div", { className: "bg-white rounded-2xl shadow-sm border border-gray-100 p-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsx(Input, { label: "Search Clients", placeholder: "Search by name, email, or company...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), icon: _jsx("span", { children: "\uD83D\uDD0D" }) }), _jsx(Select, { label: "Filter by Status", value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), options: [
                                { value: "All", label: "All Status" },
                                { value: "Active", label: "Active" },
                                { value: "Inactive", label: "Inactive" },
                            ] }), _jsx("div", { className: "flex items-end", children: _jsxs("div", { className: "text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-xl w-full text-center border border-gray-100", children: ["Showing ", filteredClients.length, " of ", clients.length, " clients"] }) })] }) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: filteredClients.length === 0 ? (_jsxs("div", { className: "col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center", children: [_jsx("div", { className: "w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center", children: _jsx("span", { className: "text-2xl", children: "\uD83D\uDC65" }) }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "No clients found" }), _jsx("p", { className: "text-gray-600 mb-4", children: "Get started by adding your first client" }), _jsx(Button, { onClick: () => setIsModalVisible(true), children: "Add Client" })] })) : (filteredClients.map((client) => (_jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg", children: _jsx("span", { className: "text-xl", children: "\uD83D\uDC64" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900", children: client.name }), _jsx("p", { className: "text-sm text-gray-600", children: client.company })] })] }), _jsx("span", { className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${client.status === "Active"
                                        ? "bg-green-100 text-green-800 border border-green-200"
                                        : "bg-gray-100 text-gray-800 border border-gray-200"}`, children: client.status })] }), _jsxs("div", { className: "space-y-2 mb-4", children: [_jsxs("div", { className: "flex items-center text-sm text-gray-600", children: [_jsx("span", { className: "mr-2", children: "\uD83D\uDCE7" }), _jsx("a", { href: `mailto:${client.email}`, className: "hover:text-blue-600 truncate", children: client.email })] }), _jsxs("div", { className: "flex items-center text-sm text-gray-600", children: [_jsx("span", { className: "mr-2", children: "\uD83D\uDCDE" }), _jsx("a", { href: `tel:${client.phone}`, className: "hover:text-blue-600", children: client.phone })] }), _jsxs("div", { className: "flex items-center text-sm text-gray-600", children: [_jsx("span", { className: "mr-2", children: "\uD83D\uDCCA" }), _jsxs("span", { children: [client.projects, " projects"] })] })] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx(Button, { onClick: () => viewClientDetails(client), variant: "outline", size: "sm", className: "flex-1", children: "View Details" }), _jsx(Button, { onClick: () => {
                                        setEditingClient(client);
                                        setFormData({
                                            name: client.name,
                                            email: client.email,
                                            phone: client.phone,
                                            company: client.company,
                                            status: client.status,
                                            notes: client.notes,
                                        });
                                        setIsModalVisible(true);
                                    }, variant: "ghost", size: "sm", children: "\u270F\uFE0F" }), _jsx(Button, { onClick: () => handleDelete(client.id), loading: deleteLoading === client.id, variant: "danger", size: "sm", children: "\uD83D\uDDD1\uFE0F" })] })] }, client.id)))) }), _jsx(Modal, { isOpen: isModalVisible, onClose: () => {
                    setIsModalVisible(false);
                    setEditingClient(null);
                    setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        company: "",
                        status: "Active",
                        notes: "",
                    });
                }, title: editingClient ? "Edit Client" : "Add New Client", size: "lg", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsx(Input, { label: "Full Name", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), placeholder: "John Smith", required: true }), _jsx(Input, { label: "Email", type: "email", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }), placeholder: "john@example.com", required: true }), _jsx(Input, { label: "Phone", value: formData.phone, onChange: (e) => setFormData({ ...formData, phone: e.target.value }), placeholder: "+1 (555) 123-4567" }), _jsx(Input, { label: "Company", value: formData.company, onChange: (e) => setFormData({ ...formData, company: e.target.value }), placeholder: "Acme Inc" })] }), _jsx(Select, { label: "Status", value: formData.status, onChange: (e) => setFormData({ ...formData, status: e.target.value }), options: [
                                { value: "Active", label: "Active" },
                                { value: "Inactive", label: "Inactive" },
                            ] }), _jsx(TextArea, { label: "Notes", value: formData.notes, onChange: (e) => setFormData({ ...formData, notes: e.target.value }), placeholder: "Additional information about the client", rows: 3 }), _jsxs("div", { className: "flex justify-end space-x-3 pt-4", children: [_jsx(Button, { type: "button", onClick: () => {
                                        setIsModalVisible(false);
                                        setEditingClient(null);
                                        setFormData({
                                            name: "",
                                            email: "",
                                            phone: "",
                                            company: "",
                                            status: "Active",
                                            notes: "",
                                        });
                                    }, variant: "secondary", children: "Cancel" }), _jsx(Button, { type: "submit", children: editingClient ? "Update Client" : "Add Client" })] })] }) }), _jsx(Modal, { isOpen: isClientDetailVisible, onClose: () => {
                    setIsClientDetailVisible(false);
                    setSelectedClient(null);
                }, title: selectedClient ? `${selectedClient.name} - Details` : "", size: "xl", children: selectedClient && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 text-center border border-blue-100", children: [_jsx("div", { className: "text-3xl font-bold text-blue-600", children: selectedClient?.projectsList?.length || 0 }), _jsx("div", { className: "text-sm text-blue-700 font-medium", children: "Total Projects" })] }), _jsxs("div", { className: "bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 text-center border border-green-100", children: [_jsx("span", { className: `inline-flex px-4 py-2 text-sm font-semibold rounded-full ${selectedClient.status === "Active"
                                                ? "bg-green-100 text-green-800 border border-green-200"
                                                : "bg-gray-100 text-gray-800 border border-gray-200"}`, children: selectedClient.status }), _jsx("div", { className: "text-sm text-green-700 font-medium mt-2", children: "Status" })] })] }), _jsxs("div", { className: "bg-gray-50 rounded-xl p-6 border border-gray-100", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Contact Information" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600 font-medium", children: "Email" }), _jsx("a", { href: `mailto:${selectedClient.email}`, className: "text-blue-600 hover:text-blue-800 font-medium", children: selectedClient.email })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600 font-medium", children: "Phone" }), _jsx("a", { href: `tel:${selectedClient.phone}`, className: "text-gray-900 font-medium", children: selectedClient.phone })] }), _jsxs("div", { className: "sm:col-span-2", children: [_jsx("div", { className: "text-sm text-gray-600 font-medium", children: "Company" }), _jsx("div", { className: "text-gray-900 font-medium", children: selectedClient.company })] })] }), selectedClient.notes && (_jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200", children: [_jsx("div", { className: "text-sm text-gray-600 font-medium", children: "Notes" }), _jsx("p", { className: "text-gray-900 mt-1", children: selectedClient.notes })] }))] }), _jsxs("div", { className: "bg-white rounded-xl border border-gray-100", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-100", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Projects" }), _jsx(Button, { onClick: () => setIsProjectModalVisible(true), size: "sm", icon: _jsx("span", { children: "\u2795" }), children: "Add Project" })] }), !selectedClient.projectsList || selectedClient.projectsList.length === 0 ? (_jsxs("div", { className: "p-8 text-center", children: [_jsx("div", { className: "w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center", children: _jsx("span", { className: "text-xl", children: "\uD83D\uDCCB" }) }), _jsx("p", { className: "text-gray-600", children: "No projects yet" })] })) : (_jsx("div", { className: "divide-y divide-gray-100", children: selectedClient.projectsList.map((project) => (_jsx("div", { className: "p-6 hover:bg-gray-50 transition-colors duration-200", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center space-x-3 mb-2", children: [_jsx("h4", { className: "font-semibold text-gray-900", children: project.name }), _jsx("span", { className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${project.status === "Active"
                                                                        ? "bg-green-100 text-green-800 border border-green-200"
                                                                        : project.status === "Completed"
                                                                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                                                                            : project.status === "On Hold"
                                                                                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                                                                : "bg-red-100 text-red-800 border border-red-200"}`, children: project.status })] }), _jsx("p", { className: "text-sm text-gray-600 mb-2", children: project.description }), _jsxs("span", { className: "text-xs text-gray-500", children: ["Created: ", new Date(project.createdAt).toLocaleDateString()] })] }), _jsx(Button, { onClick: () => deleteProject(project.id), variant: "danger", size: "sm", children: "\uD83D\uDDD1\uFE0F" })] }) }, project.id))) }))] })] })) }), _jsx(Modal, { isOpen: isProjectModalVisible, onClose: () => {
                    setIsProjectModalVisible(false);
                    setProjectFormData({
                        name: "",
                        description: "",
                        status: "Active",
                    });
                }, title: `Add Project for ${selectedClient?.name}`, size: "lg", children: _jsxs("form", { onSubmit: handleProjectSubmit, className: "space-y-6", children: [_jsx(Input, { label: "Project Title", value: projectFormData.name, onChange: (e) => setProjectFormData({ ...projectFormData, name: e.target.value }), placeholder: "Website Redesign", required: true }), _jsx(TextArea, { label: "Description", value: projectFormData.description, onChange: (e) => setProjectFormData({ ...projectFormData, description: e.target.value }), placeholder: "Detailed description of the project", rows: 3, required: true }), _jsx(Select, { value: projectFormData.status, onChange: (e) => setProjectFormData({ ...projectFormData, status: e.target.value }), options: [
                                { value: "Active", label: "Active" },
                                { value: "On Hold", label: "On Hold" },
                                { value: "Completed", label: "Completed" },
                                { value: "Cancelled", label: "Cancelled" },
                            ] }), _jsxs("div", { className: "flex justify-end space-x-3 pt-4", children: [_jsx(Button, { type: "button", onClick: () => {
                                        setIsProjectModalVisible(false);
                                        setProjectFormData({
                                            name: "",
                                            description: "",
                                            status: "Active",
                                        });
                                    }, variant: "secondary", children: "Cancel" }), _jsx(Button, { type: "submit", loading: projectSubmitLoading, children: "Add Project" })] })] }) })] }));
}
