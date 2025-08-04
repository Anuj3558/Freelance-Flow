"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import { useNotification } from "./ui/notification"
import { Button } from "./ui/button"
import { Input, TextArea } from "./ui/input"
import { Select } from "./ui/select"
import { Modal } from "./ui/modal"
import { CardSkeleton, TableSkeleton } from "./ui/skeleton"

interface Project {
  id: number
  name: string
  description: string
  status: "Active" | "Completed" | "On Hold" | "Cancelled"
  createdAt: string
  clientId?: number
}

interface Client {
  id: number
  name: string
  email: string
  phone: string
  company: string
  projects: number
  status: "Active" | "Inactive"
  notes: string
  projectsList?: Project[]
}

const API_URL = "http://localhost:5000/api/clients"

export default function ClientManagement() {
  const { addNotification } = useNotification()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isClientDetailVisible, setIsClientDetailVisible] = useState(false)
  const [isProjectModalVisible, setIsProjectModalVisible] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
  const [projectSubmitLoading, setProjectSubmitLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "Active",
    notes: "",
  })
  const [projectFormData, setProjectFormData] = useState({
    name: "",
    description: "",
    status: "Active",
  })

  // Helper to safely get clients array
  const getSafeClients = () => (Array.isArray(clients) ? clients : [])

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

  // Fetch clients from API
  const fetchClients = async () => {
    setLoading(true)
    try {
      const data = await authFetch(API_URL + "/get-all-clients")
      const enrichedData = Array.isArray(data)
        ? data.map((client) => ({
            ...client,
            projectsList: client.projectsList || [],
          }))
        : []
      setClients(enrichedData)
    } catch (error) {
      console.error("Failed to fetch clients:", error)
      
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  // Calculate statistics


  // Filter clients based on search and status
  const filteredClients = React.useMemo(() => {
    const safeClients = getSafeClients()
    return safeClients.filter((client) => {
      if (!client) return false

      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        client.name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.company?.toLowerCase().includes(searchLower)

      const matchesStatus = statusFilter === "All" || client.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [clients, searchTerm, statusFilter])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingClient) {
        await authFetch(`${API_URL}/update-client/${editingClient.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        })
        setClients((prevClients) => prevClients.map((c) => (c.id === editingClient.id ? { ...c, ...formData } : c)))
        addNotification({
          type: "success",
          title: "Success",
          message: "Client updated successfully",
        })
      } else {
        const newClient = await authFetch(API_URL + "/create-client", {
          method: "POST",
          body: JSON.stringify({ ...formData, projects: 0 }),
        })
        setClients((prevClients) => [
          ...prevClients,
          {
            ...newClient,
            projectsList: [],
          },
        ])
        addNotification({
          type: "success",
          title: "Success",
          message: "Client added successfully",
        })
      }

      setIsModalVisible(false)
      setEditingClient(null)
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        status: "Active",
        notes: "",
      })
    } catch (error) {
      console.error("Operation failed:", error)
      addNotification({
        type: "error",
        title: "Error",
        message: error instanceof Error ? error.message : "Operation failed",
      })
    }
  }

  // Handle project submission
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient) {
      addNotification({
        type: "error",
        title: "Error",
        message: "No client selected",
      })
      return
    }

    setProjectSubmitLoading(true)
    try {
      const projectData = {
        title: projectFormData.name,
        description: projectFormData.description,
        status: projectFormData.status,
        clientId: selectedClient.id,
      }

      const newProject = await authFetch(`${API_URL}/create-project/${selectedClient.id}`, {
        method: "POST",
        body: JSON.stringify(projectData),
      })

      const updateProject = {
        name: newProject.data.name,
        description: newProject.data.description,
        status: newProject.data.status,
        id: newProject.data.id,
        createdAt: newProject.data.createdAt || new Date().toISOString().split("T")[0],
      }

      const updatedClients = clients.map((c) => {
        if (c.id === selectedClient.id) {
          return {
            ...c,
            projects: c.projects + 1,
            projectsList: [...(c.projectsList || []), updateProject],
          }
        }
        return c
      })

      setClients(updatedClients)

      const updatedSelectedClient = {
        ...selectedClient,
        projects: selectedClient.projects + 1,
        projectsList: [...(selectedClient.projectsList || []), updateProject],
      }
      setSelectedClient(updatedSelectedClient)

      addNotification({
        type: "success",
        title: "Success",
        message: "Project added successfully",
      })
      setIsProjectModalVisible(false)
      setProjectFormData({
        name: "",
        description: "",
        status: "Active",
      })
    } catch (error) {
      console.error("Project creation failed:", error)
      addNotification({
        type: "error",
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create project",
      })
    } finally {
      setProjectSubmitLoading(false)
    }
  }

  // Handle client deletion
  const handleDelete = async (id: number) => {
    setDeleteLoading(id)
    try {
      await authFetch(`${API_URL}/delete-client/${id}`, {
        method: "DELETE",
      })

      setClients((prevClients) => prevClients.filter((c) => c.id !== id))
      addNotification({
        type: "success",
        title: "Success",
        message: "Client deleted successfully",
      })

      if (selectedClient?.id === id) {
        setIsClientDetailVisible(false)
        setSelectedClient(null)
      }
    } catch (error) {
      console.error("Delete failed:", error)
      addNotification({
        type: "error",
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to delete client",
      })
    } finally {
      setDeleteLoading(null)
    }
  }

  // View client details
  const viewClientDetails = (client: Client) => {
    fetchClientProjects(client.id, client)
    setIsClientDetailVisible(true)
  }

  // Export to CSV
  const exportToCSV = () => {
    if (filteredClients.length === 0) {
      addNotification({
        type: "warning",
        title: "No Data",
        message: "There are no clients to export",
      })
      return
    }

    const headers = ["Name", "Email", "Phone", "Company", "Projects", "Status", "Notes"]
    const csvContent = [
      headers.join(","),
      ...filteredClients.map((client) =>
        [client.name, client.email, client.phone, client.company, client.projects, client.status, client.notes]
          .map((field) => `"${field?.toString().replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `clients_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const deleteProject = async (projectId: number) => {
    try {
      await authFetch(`${API_URL}/delete-project/${projectId}`, {
        method: "DELETE",
      })

      if (selectedClient) {
        const updatedProjects = (selectedClient.projectsList || []).filter((project) => project.id !== projectId)
        setSelectedClient({
          ...selectedClient,
          projects: updatedProjects.length,
          projectsList: updatedProjects,
        })
      }

      setClients((prevClients) =>
        prevClients.map((client) =>
          client.id === selectedClient?.id
            ? {
                ...client,
                projects: (client.projectsList?.length || 0) - 1,
                projectsList: (client.projectsList || []).filter((project) => project.id !== projectId),
              }
            : client,
        ),
      )

      addNotification({
        type: "success",
        title: "Success",
        message: "Project deleted successfully",
      })
    } catch (error) {
      console.error("Failed to delete project:", error)
      addNotification({
        type: "error",
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to delete project",
      })
    }
  }

  const fetchClientProjects = async (clientId: number, currClient: Client) => {
    try {
      const projects = await authFetch(`${API_URL}/get-client-projects/${clientId}`)
      const data = projects.data

      const updatedSelectedClient = {
        ...currClient,
        projectsList: Array.isArray(data) ? data : [],
      }
      setSelectedClient(updatedSelectedClient)

      setClients((prevClients) =>
        prevClients.map((client) =>
          client.id === clientId ? { ...client, projectsList: Array.isArray(data) ? data : [] } : client,
        ),
      )
    } catch (error) {
      console.error("Failed to fetch client projects:", error)
      addNotification({
        type: "error",
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to fetch projects",
      })

      if (selectedClient) {
        setSelectedClient({
          ...selectedClient,
          projectsList: [],
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>

        {/* Filters Skeleton */}
        <CardSkeleton className="h-32" />

        {/* Table Skeleton */}
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Management</h1>
          <p className="text-gray-600">Manage your clients and track their projects efficiently</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={exportToCSV}
            disabled={filteredClients.length === 0}
            variant="outline"
            icon={<span>📊</span>}
          >
            Export CSV
          </Button>
          <Button onClick={() => setIsModalVisible(true)} icon={<span>➕</span>}>
            Add Client
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
   
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="Search Clients"
            placeholder="Search by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<span>🔍</span>}
          />
          <Select
            label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "All", label: "All Status" },
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />
          <div className="flex items-end">
            <div className="text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-xl w-full text-center border border-gray-100">
              Showing {filteredClients.length} of {clients.length} clients
            </div>
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first client</p>
            <Button onClick={() => setIsModalVisible(true)}>Add Client</Button>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg">
                    <span className="text-xl">👤</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                    <p className="text-sm text-gray-600">{client.company}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    client.status === "Active"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-gray-100 text-gray-800 border border-gray-200"
                  }`}
                >
                  {client.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">📧</span>
                  <a href={`mailto:${client.email}`} className="hover:text-blue-600 truncate">
                    {client.email}
                  </a>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">📞</span>
                  <a href={`tel:${client.phone}`} className="hover:text-blue-600">
                    {client.phone}
                  </a>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">📊</span>
                  <span>{client.projects} projects</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={() => viewClientDetails(client)} variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                <Button
                  onClick={() => {
                    setEditingClient(client)
                    setFormData({
                      name: client.name,
                      email: client.email,
                      phone: client.phone,
                      company: client.company,
                      status: client.status,
                      notes: client.notes,
                    })
                    setIsModalVisible(true)
                  }}
                  variant="ghost"
                  size="sm"
                >
                  ✏️
                </Button>
                <Button
                  onClick={() => handleDelete(client.id)}
                  loading={deleteLoading === client.id}
                  variant="danger"
                  size="sm"
                >
                  🗑️
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Client Modal */}
      <Modal
        isOpen={isModalVisible}
        onClose={() => {
          setIsModalVisible(false)
          setEditingClient(null)
          setFormData({
            name: "",
            email: "",
            phone: "",
            company: "",
            status: "Active",
            notes: "",
          })
        }}
        title={editingClient ? "Edit Client" : "Add New Client"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Smith"
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
            <Input
              label="Company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Acme Inc"
            />
          </div>

          <Select
            label="Status"
            value={formData.status}
            onChange={(e : React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />

          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional information about the client"
            rows={3}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setIsModalVisible(false)
                setEditingClient(null)
                setFormData({
                  name: "",
                  email: "",
                  phone: "",
                  company: "",
                  status: "Active",
                  notes: "",
                })
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button type="submit">{editingClient ? "Update Client" : "Add Client"}</Button>
          </div>
        </form>
      </Modal>

      {/* Client Details Modal */}
      <Modal
        isOpen={isClientDetailVisible}
        onClose={() => {
          setIsClientDetailVisible(false)
          setSelectedClient(null)
        }}
        title={selectedClient ? `${selectedClient.name} - Details` : ""}
        size="xl"
      >
        {selectedClient && (
          <div className="space-y-6">
            {/* Client Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 text-center border border-blue-100">
                <div className="text-3xl font-bold text-blue-600">{selectedClient?.projectsList?.length || 0}</div>
                <div className="text-sm text-blue-700 font-medium">Total Projects</div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 text-center border border-green-100">
                <span
                  className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${
                    selectedClient.status === "Active"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-gray-100 text-gray-800 border border-gray-200"
                  }`}
                >
                  {selectedClient.status}
                </span>
                <div className="text-sm text-green-700 font-medium mt-2">Status</div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 font-medium">Email</div>
                  <a href={`mailto:${selectedClient.email}`} className="text-blue-600 hover:text-blue-800 font-medium">
                    {selectedClient.email}
                  </a>
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-medium">Phone</div>
                  <a href={`tel:${selectedClient.phone}`} className="text-gray-900 font-medium">
                    {selectedClient.phone}
                  </a>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-sm text-gray-600 font-medium">Company</div>
                  <div className="text-gray-900 font-medium">{selectedClient.company}</div>
                </div>
              </div>
              {selectedClient.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600 font-medium">Notes</div>
                  <p className="text-gray-900 mt-1">{selectedClient.notes}</p>
                </div>
              )}
            </div>

            {/* Projects List */}
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
                <Button onClick={() => setIsProjectModalVisible(true)} size="sm" icon={<span>➕</span>}>
                  Add Project
                </Button>
              </div>

              {!selectedClient.projectsList || selectedClient.projectsList.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">📋</span>
                  </div>
                  <p className="text-gray-600">No projects yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {selectedClient.projectsList.map((project) => (
                    <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{project.name}</h4>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                project.status === "Active"
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : project.status === "Completed"
                                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                                    : project.status === "On Hold"
                                      ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                      : "bg-red-100 text-red-800 border border-red-200"
                              }`}
                            >
                              {project.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                          <span className="text-xs text-gray-500">
                            Created: {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Button onClick={() => deleteProject(project.id)} variant="danger" size="sm">
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Project Modal */}
      <Modal
        isOpen={isProjectModalVisible}
        onClose={() => {
          setIsProjectModalVisible(false)
          setProjectFormData({
            name: "",
            description: "",
            status: "Active",
          })
        }}
        title={`Add Project for ${selectedClient?.name}`}
        size="lg"
      >
        <form onSubmit={handleProjectSubmit} className="space-y-6">
          <Input
            label="Project Title"
            value={projectFormData.name}
            onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
            placeholder="Website Redesign"
            required
          />

          <TextArea
            label="Description"
            value={projectFormData.description}
            onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
            placeholder="Detailed description of the project"
            rows={3}
            required
          />

          <Select
            
            value={projectFormData.status}
            onChange={(e) => setProjectFormData({ ...projectFormData, status: e.target.value })}
            options={[
              { value: "Active", label: "Active" },
              { value: "On Hold", label: "On Hold" },
              { value: "Completed", label: "Completed" },
              { value: "Cancelled", label: "Cancelled" },
            ]}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setIsProjectModalVisible(false)
                setProjectFormData({
                  name: "",
                  description: "",
                  status: "Active",
                })
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button type="submit" loading={projectSubmitLoading}>
              Add Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
