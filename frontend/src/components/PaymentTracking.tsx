"use client"

import { useState, useEffect } from "react"
import { GoogleGenerativeAI } from "@google/generative-ai"
import Cookies from "js-cookie"

interface Client {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
  status?: string
}

interface Project {
  id: string
  clientId: string
  name: string
  description: string
  industry?: string
  status: string
  createdAt?: string
  milestones: []
}

interface EstimatePlan {
  _id?: string
  id?: string
  name: string
  description: string
  timeline: string
  price: number
  features: string[]
  techStack: string[]
  projectId?: string
  clientId?: string
  createdAt?: string
  isSelected?: boolean
}

interface Milestone {
  id: number
  name: string
  percentage: number
  amount: number
  dueDate: string
  status: "Pending" | "Paid" | "Overdue"
  description: string
}

interface ProjectWithMilestones {
  id: number
  name: string
  client: string
  totalAmount: number
  milestones: Milestone[]
  createdDate: string
  estimateFile?: string
  startDate?: string
  endDate?: string
  selectedEstimate?: EstimatePlan
}

export default function IntegratedProjectFlow() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingEstimates, setLoadingEstimates] = useState(false)
  const [generatingMilestones, setGeneratingMilestones] = useState(false)

  // API Data
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [estimates, setEstimates] = useState<EstimatePlan[]>([])

  // Selected Data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedEstimate, setSelectedEstimate] = useState<EstimatePlan | null>(null)

  // Project Configuration
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Generated Milestones
  const [generatedMilestones, setGeneratedMilestones] = useState<Milestone[]>([])
  const [projectWithMilestones, setProjectWithMilestones] = useState<ProjectWithMilestones | null>(null)

  // API URLs
  const API_URL = "http://localhost:5000/api/clients"
  const ESTIMATES_API_URL = "http://localhost:5000/api/estimates"
  const MILESTONES_API_URL = "http://localhost:5000/api/milestones"

  // Get JWT token from cookies
  const getAuthToken = () => {
    const token = Cookies.get("jwt_token")
    if (!token) {
      alert("Authentication Error: Please login to continue")
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

  // Fetch clients
  const fetchClients = async (): Promise<Client[]> => {
    try {
      const data = await authFetch(API_URL + "/get-all-clients")
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error("Error fetching clients:", error)
      return []
    }
  }

  // Fetch projects by client
  const fetchProjectsByClient = async (clientId: string): Promise<Project[]> => {
    try {
      const response = await authFetch(`${API_URL}/get-client-projects/${clientId}`)
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error("Error fetching projects:", error)
      return []
    }
  }

  // Fetch estimates by project
  const fetchEstimatesByProject = async (projectId: string): Promise<EstimatePlan[]> => {
    try {
      const response = await authFetch(`${ESTIMATES_API_URL}/all-estimates/${projectId}`)
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error("Error fetching estimates:", error)
      alert(`Failed to load estimates: ${error instanceof Error ? error.message : "Unknown error"}`)
      return []
    }
  }

  // Generate AI milestones
  const generateMilestonesWithAI = async () => {
    if (!selectedEstimate || !selectedProject || !selectedClient || !startDate || !endDate) {
      alert("Please fill in all required fields")
      return
    }

    setGeneratingMilestones(true)
    try {
      // Initialize the Gemini API
      const genAI = new GoogleGenerativeAI("AIzaSyDEW-XA8JW-x4WpZS6n5gGA584584Xgf1k")
      const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" })

      const prompt = `
        Based on the following project and estimate details, create a payment milestone breakdown:
        
        Client: ${selectedClient.name} (${selectedClient.company || "Individual"})
        Project: ${selectedProject.name}
        Project Description: ${selectedProject.description}
        
        Selected Estimate: ${selectedEstimate.name}
        Estimate Description: ${selectedEstimate.description}
        Total Amount: $${selectedEstimate.price}
        Timeline: ${selectedEstimate.timeline}
        Technology Stack: ${selectedEstimate.techStack.join(", ")}
        Key Features: ${selectedEstimate.features.join(", ")}
        
        Project Start Date: ${startDate}
        Project End Date: ${endDate}
        
        Create 4-6 logical payment milestones with:
        - Milestone name
        - Description of deliverables based on the estimate features
        - Percentage of total payment (should add up to 100%)
        - Due date (distributed between start and end date)
        
        Consider the estimate's features and tech stack when creating milestones.
        Make milestones realistic for ${selectedEstimate.name} complexity level.
        
        Format as a valid JSON array with this exact structure:
        [
          {
            "name": "Project Kickoff & Setup",
            "description": "Initial payment and project setup",
            "percentage": 25,
            "dueDate": "2024-01-15"
          }
        ]
        
        Make sure dates are realistic and evenly distributed between ${startDate} and ${endDate}.
        Base milestone complexity on the selected estimate plan features.
        Only return the JSON array, no additional text or markdown.
      `

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const aiMilestones = JSON.parse(jsonMatch[0])

        // Convert to our milestone format
        const milestones: Milestone[] = aiMilestones.map((milestone: any, index: number) => ({
          id: Date.now() + index,
          name: milestone.name,
          description: milestone.description,
          percentage: milestone.percentage,
          amount: Math.round((milestone.percentage / 100) * selectedEstimate.price),
          dueDate: milestone.dueDate,
          status: "Pending" as const,
        }))

        setGeneratedMilestones(milestones)

        // Create project with milestones
        const newProject: ProjectWithMilestones = {
          id: Date.now(),
          name: selectedProject.name,
          client: selectedClient.name,
          totalAmount: selectedEstimate.price,
          createdDate: new Date().toISOString().split("T")[0],
          startDate: startDate,
          endDate: endDate,
          selectedEstimate: selectedEstimate,
          milestones: milestones,
        }

        setProjectWithMilestones(newProject)

        // Save milestones to backend
        await saveMilestonesToBackend(
          milestones,
          selectedProject.id,
          selectedClient.id,
          selectedEstimate._id || selectedEstimate.id,
        )

        setStep(5) // Go to final review
      } else {
        throw new Error("Failed to parse milestones")
      }
    } catch (error) {
      console.error("Error generating milestones:", error)
      alert("Failed to generate milestones. Please try again.")
    } finally {
      setGeneratingMilestones(false)
    }
  }

  // Save milestones to backend
  const saveMilestonesToBackend = async (
    milestones: Milestone[],
    projectId: string,
    clientId: string,
    estimateId?: string,
  ) => {
    try {
      const milestonesWithProjectInfo = milestones.map((milestone) => ({
        ...milestone,
        projectId,
        clientId,
        estimateId,
        createdAt: new Date().toISOString(),
      }))
      console.log(milestonesWithProjectInfo)
      // You can implement this API endpoint to save milestones
      const response = await authFetch(`${MILESTONES_API_URL}/create-milestones/${clientId}`, {
        method: "POST",
        body: JSON.stringify({
          milestones: milestonesWithProjectInfo,
          projectId,
          clientId,
          estimateId,
          startDate,
          endDate,
        }),
      })

      console.log("Milestones saved successfully:", response)
      return response.success === true
    } catch (error) {
      console.error("Error saving milestones:", error)
      // Don't show alert here as it's called after successful generation
      return false
    }
  }

  // Load clients on component mount
  useEffect(() => {
    const loadClients = async () => {
      try {
        const clientData = await fetchClients()
        setClients(clientData)
      } catch (error) {
        console.error("Error loading clients:", error)
      } finally {
        setLoadingClients(false)
      }
    }

    loadClients()
  }, [])

  // Handle client selection
  const handleClientSelect = async (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    if (!client) return

    setSelectedClient(client)
    setSelectedProject(null)
    setSelectedEstimate(null)
    setEstimates([])
    setLoadingProjects(true)

    try {
      const projectData = await fetchProjectsByClient(clientId)
      const filteredProjects = projectData.filter((p) => p.milestones.length === 0)
      console.log("Filtered Projects:", filteredProjects)
      setProjects(filteredProjects)
    } catch (error) {
      console.error("Error fetching projects:", error)
      setProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  // Handle project selection
  const handleProjectSelect = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return

    setSelectedProject(project)
    setSelectedEstimate(null)
    setLoadingEstimates(true)

    try {
      const estimateData = await fetchEstimatesByProject(projectId)
      const selectedEstimates = estimateData.filter((e) => e.isSelected === true)

      if (selectedEstimates.length === 1) {
        // If only one selected estimate exists, use it and skip to timeline step
        setSelectedEstimate(selectedEstimates[0])
        setStep(4) // Skip directly to timeline step
      } else {
        // Show all estimates if none or multiple are selected
        setEstimates(estimateData)
        setStep(3) // Go to estimate selection step
      }
    } catch (error) {
      console.error("Error fetching estimates:", error)
      setEstimates([])
    } finally {
      setLoadingEstimates(false)
    }
  }

  // Handle estimate selection
  const handleEstimateSelect = (estimateId: string) => {
    const estimate = estimates.find((e) => (e._id || e.id) === estimateId)
    if (estimate) {
      setSelectedEstimate(estimate)
    }
  }

  // Calculate progress based on steps
  const getProgressPercentage = () => {
    return (step / 5) * 100
  }

  // Reset workflow
  const resetWorkflow = () => {
    setStep(1)
    setSelectedClient(null)
    setSelectedProject(null)
    setSelectedEstimate(null)
    setStartDate("")
    setEndDate("")
    setGeneratedMilestones([])
    setProjectWithMilestones(null)
    setProjects([])
    setEstimates([])
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Project Setup & Milestone Generator</h2>
          <div className="text-sm text-gray-500">Step {step} of 5</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-slate-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span className={step >= 1 ? "text-slate-600 font-medium" : ""}>Select Client</span>
          <span className={step >= 2 ? "text-slate-600 font-medium" : ""}>Choose Project</span>
          <span className={step >= 3 ? "text-slate-600 font-medium" : ""}>Pick Estimate</span>
          <span className={step >= 4 ? "text-slate-600 font-medium" : ""}>Set Timeline</span>
          <span className={step >= 5 ? "text-slate-600 font-medium" : ""}>Review & Generate</span>
        </div>
      </div>

      {/* Step 1: Select Client */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Step 1: Select Client</h3>
          {loadingClients ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
              <span className="ml-3 text-gray-600">Loading clients...</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No clients found. Please add clients first in the Client Management section.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      handleClientSelect(client.id)
                      setStep(2)
                    }}
                    className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <span className="text-xl">👤</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{client.name}</h4>
                        <p className="text-sm text-gray-600 truncate">{client.company || "Individual"}</p>
                        <p className="text-xs text-gray-500 truncate">{client.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Select Project */}
      {step === 2 && selectedClient && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Step 2: Select Project</h3>
            <button onClick={() => setStep(1)} className="text-slate-600 hover:text-slate-800 text-sm">
              ← Change Client
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Selected Client:</span> {selectedClient.name} (
              {selectedClient.company || "Individual"})
            </p>
          </div>

          {loadingProjects ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
              <span className="ml-3 text-gray-600">Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No projects found for this client. Please add projects first in the Client Management section.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => {
                    handleProjectSelect(project.id)
                    setStep(3)
                  }}
                  className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <span className="text-xl">📋</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">{project.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            project.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : project.status === "Completed"
                                ? "bg-blue-100 text-blue-800"
                                : project.status === "On Hold"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {project.status}
                        </span>
                        {project.industry && <span className="text-xs text-gray-500">{project.industry}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Select Estimate */}
      {step === 3 && selectedProject && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Step 3: Select Estimate Plan</h3>
            <button onClick={() => setStep(2)} className="text-slate-600 hover:text-slate-800 text-sm">
              ← Change Project
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Selected Project:</span> {selectedProject.name}
            </p>
          </div>

          {loadingEstimates ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
              <span className="ml-3 text-gray-600">Loading estimates...</span>
            </div>
          ) : estimates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No estimates found for this project. Please generate estimates first in the Estimate Generator section.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {estimates.map((estimate) => (
                <div
                  key={estimate._id || estimate.id}
                  onClick={() => {
                    handleEstimateSelect(estimate._id || estimate.id!)
                    setStep(4)
                  }}
                  className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-xl font-medium text-gray-900">{estimate.name}</h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900">${estimate.price.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">{estimate.timeline}</div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{estimate.description}</p>

                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">Key Features:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {estimate.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                      {estimate.features.length > 3 && (
                        <li className="text-xs text-gray-500">+ {estimate.features.length - 3} more features</li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Tech Stack:</h5>
                    <div className="flex flex-wrap gap-2">
                      {estimate.techStack.slice(0, 4).map((tech, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {tech}
                        </span>
                      ))}
                      {estimate.techStack.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                          +{estimate.techStack.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Set Timeline */}
      {step === 4 && selectedEstimate && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Step 4: Set Project Timeline</h3>
            <button onClick={() => setStep(3)} className="text-slate-600 hover:text-slate-800 text-sm">
              ← Change Estimate
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Client:</span> {selectedClient?.name}
              </div>
              <div>
                <span className="font-medium">Project:</span> {selectedProject?.name}
              </div>
              <div>
                <span className="font-medium">Estimate:</span> {selectedEstimate.name} ($
                {selectedEstimate.price.toLocaleString()})
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                required
              />
            </div>

            {startDate && endDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Project Duration</h4>
                <p className="text-sm text-gray-600">
                  {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))}{" "}
                  days ({selectedEstimate.timeline} estimated)
                </p>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button
                onClick={generateMilestonesWithAI}
                disabled={generatingMilestones || !startDate || !endDate}
                className="px-8 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {generatingMilestones && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {generatingMilestones ? "Generating Milestones..." : "Generate AI Milestones"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Review Generated Milestones */}
      {step === 5 && projectWithMilestones && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Step 5: Review Generated Milestones</h3>

            {/* Project Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Client:</span> {projectWithMilestones.client}
                </div>
                <div>
                  <span className="font-medium">Project:</span> {projectWithMilestones.name}
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span> $
                  {projectWithMilestones.totalAmount.toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Timeline:</span> {startDate} to {endDate}
                </div>
              </div>
            </div>

            {/* Estimate Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">
                Selected Estimate: {projectWithMilestones.selectedEstimate?.name}
              </h4>
              <p className="text-sm text-gray-600 mb-3">{projectWithMilestones.selectedEstimate?.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Key Features:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {projectWithMilestones.selectedEstimate?.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx}>• {feature}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Technology:</h5>
                  <div className="flex flex-wrap gap-1">
                    {projectWithMilestones.selectedEstimate?.techStack.map((tech, idx) => (
                      <span key={idx} className="px-2 py-1 bg-white border text-gray-700 text-xs rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Generated Milestones */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">AI-Generated Payment Milestones</h4>
              {projectWithMilestones.milestones.map((milestone) => (
                <div key={milestone.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{milestone.name}</h5>
                      <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-semibold text-gray-900">${milestone.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{milestone.percentage}%</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${milestone.status === "Pending" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}
                      >
                        {milestone.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        Due: {new Date(milestone.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6">
              <button
                onClick={() => setStep(4)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                ← Back to Timeline
              </button>
              <div className="space-x-3">
                <button
                  onClick={resetWorkflow}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Start New Project
                </button>
                <button
                  onClick={() => {
                    // Implement save functionality
                    alert("Project and milestones saved successfully!")
                    resetWorkflow()
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                >
                  Save & Finish
                </button>
              </div>
            </div>
          </div>

          {/* Project Summary Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="font-medium text-gray-900 mb-4">Project Financial Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Total Project Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${projectWithMilestones.totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-600">Milestones Created</p>
                <p className="text-2xl font-semibold text-blue-900">{projectWithMilestones.milestones.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-600">Estimated Completion</p>
                <p className="text-2xl font-semibold text-green-900">
                  {new Date(projectWithMilestones.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
