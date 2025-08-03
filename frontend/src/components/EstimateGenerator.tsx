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
}

interface EstimatePlan {
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

export default function EstimateGenerator() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [checkingExistingEstimates, setCheckingExistingEstimates] = useState(false)
  const [savingEstimates, setSavingEstimates] = useState(false)
  const [selectingEstimate, setSelectingEstimate] = useState(false)

  // API Data
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Estimate Data
  const [estimates, setEstimates] = useState<EstimatePlan[]>([])
  const [selectedEstimate, setSelectedEstimate] = useState<EstimatePlan | null>(null)
  const [existingEstimates, setExistingEstimates] = useState<EstimatePlan[]>([])
  const [showExistingOnly, setShowExistingOnly] = useState(false)
  const [hasSelectedEstimate, setHasSelectedEstimate] = useState(false)

  // API URL - same as Client Management
  const API_URL = "http://localhost:5000/api/clients"
  const ESTIMATES_API_URL = "http://localhost:5000/api/estimates"

  // Get JWT token from cookies (same as Client Management)
  const getAuthToken = () => {
    const token = Cookies.get("jwt_token")
    if (!token) {
      alert("Authentication Error: Please login to continue")
      throw new Error("No JWT token found")
    }
    return token
  }

  // Authorized fetch wrapper (same as Client Management)
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

  // Fetch clients from API (using actual API)
  const fetchClients = async (): Promise<Client[]> => {
    try {
      const data = await authFetch(API_URL + "/get-all-clients")
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error("Error fetching clients:", error)
      return []
    }
  }

  // Fetch projects by client (using actual API)
  const fetchProjectsByClient = async (clientId: string): Promise<Project[]> => {
    try {
      const response = await authFetch(`${API_URL}/get-client-projects/${clientId}`)
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error("Error fetching projects:", error)
      return []
    }
  }

  // Check for existing estimates for a project
  const checkExistingEstimates = async (projectId: string): Promise<EstimatePlan[]> => {
    try {
      const response = await authFetch(`${ESTIMATES_API_URL}/all-estimates/${projectId}`)
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error("Error checking existing estimates:", error)
      // Don't show alert for this as it's optional check
      return []
    }
  }

  // Save estimates to backend
  const saveEstimatesToBackend = async (
    estimates: EstimatePlan[],
    projectId: string,
    clientId: string,
  ): Promise<boolean> => {
    try {
      const estimatesWithProjectInfo = estimates.map((estimate) => ({
        ...estimate,
        projectId,
        clientId,
        createdAt: new Date().toISOString(),
      }))

      const response = await authFetch(`${ESTIMATES_API_URL}/add-all-estimates/${projectId}`, {
        method: "POST",
        body: JSON.stringify({
          estimates: estimatesWithProjectInfo,
          projectId,
          clientId,
        }),
      })

      return response.success === true
    } catch (error) {
      console.error("Error saving estimates:", error)
      alert(`Failed to save estimates: ${error instanceof Error ? error.message : "Unknown error"}`)
      return false
    }
  }

  // Select estimate via API
  const selectEstimateAPI = async (estimateId: string): Promise<boolean> => {
    try {
      const response = await authFetch(`${ESTIMATES_API_URL}/select-estimate/${estimateId}`, {
        method: "PUT",
      })

      return response.success === true
    } catch (error) {
      console.error("Error selecting estimate:", error)
      alert(`Failed to select estimate: ${error instanceof Error ? error.message : "Unknown error"}`)
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

  // Load projects when client is selected
  const handleClientSelect = async (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    if (!client) return

    setSelectedClient(client)
    setSelectedProject(null)
    setLoadingProjects(true)
    setExistingEstimates([])
    setShowExistingOnly(false)
    setHasSelectedEstimate(false)

    try {
      const projectData = await fetchProjectsByClient(clientId)
      setProjects(projectData)
    } catch (error) {
      console.error("Error fetching projects:", error)
      setProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  const handleProjectSelect = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return

    setSelectedProject(project)

    // Check for existing estimates
    setCheckingExistingEstimates(true)
    try {
      const existing = await checkExistingEstimates(projectId)
      setExistingEstimates(existing)

      // Check if any estimate is already selected
      const selectedEstimate = existing.find((est) => est.isSelected)
      const hasSelected = !!selectedEstimate
      setHasSelectedEstimate(hasSelected)

      if (hasSelected) {
        // Show only the selected estimate
        setEstimates([selectedEstimate])
        setSelectedEstimate(selectedEstimate)
        setShowExistingOnly(true)
        setStep(3) // Go directly to final review
      } else if (existing.length > 0) {
        // Show all existing estimates for selection
        setShowExistingOnly(true)
        setEstimates(existing)
        setStep(2)
      }
    } catch (error) {
      console.error("Error checking existing estimates:", error)
    } finally {
      setCheckingExistingEstimates(false)
    }
  }

  const generateNewEstimates = async () => {
    if (!selectedProject || !selectedClient) return

    setLoading(true)
    setShowExistingOnly(false)
    setHasSelectedEstimate(false)

    try {
      // Initialize the Gemini API
      const genAI = new GoogleGenerativeAI("AIzaSyDEW-XA8JW-x4WpZS6n5gGA584584Xgf1k")
      const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" })

      const prompt = `
        Generate 4 different project estimates for the following project:
        
        Client: ${selectedClient.name} (${selectedClient.company || "Individual"})
        Project Name: ${selectedProject.name}
        Project Description: ${selectedProject.description}
        Industry: ${selectedProject.industry || "General"}
        
        Create estimates for:
        1. Basic Plan - Minimal viable product
        2. Standard Plan - Recommended industry-standard approach
        3. Premium Plan - Feature-rich and scalable solution
        4. Enterprise Plan - Full-scale solution with advanced features
        
        For each plan, provide:
        - Name
        - Brief description (2-3 sentences)
        - Timeline (in weeks)
        - Price (in USD)
        - Key features (5-7 bullet points)
        - Recommended tech stack (3-5 technologies)
        
        Format as a valid JSON array with this exact structure:
        [
          {
            "name": "Basic Plan",
            "description": "...",
            "timeline": "4-6 weeks",
            "price": 5000,
            "features": ["...", "..."],
            "techStack": ["...", "..."]
          },
          {...}
        ]
        
        Make prices realistic for freelance development work based on the project complexity and industry.
        Only return the JSON array, no additional text or markdown.
      `

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsedEstimates = JSON.parse(jsonMatch[0])
        setEstimates(parsedEstimates)

        // Save estimates to backend
        setSavingEstimates(true)
        try {
          const saved = await saveEstimatesToBackend(parsedEstimates, selectedProject.id, selectedClient.id)
          if (saved) {
            console.log("Estimates saved successfully to backend")
          }
        } catch (error) {
          console.error("Error saving estimates to backend:", error)
        } finally {
          setSavingEstimates(false)
        }

        setStep(2)
      } else {
        throw new Error("Failed to parse estimates")
      }
    } catch (error) {
      console.error("Error generating estimates:", error)
      alert(`Failed to generate estimates: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const selectEstimate = async (estimate: EstimatePlan) => {
    console.log(estimate)
    if (!estimate?._id) {
      alert("Cannot select estimate: Missing estimate ID")
      return
    }

    setSelectingEstimate(true)
    try {
      const success = await selectEstimateAPI(estimate?._id)
      if (success) {
        setSelectedEstimate(estimate)
        setHasSelectedEstimate(true)
        setStep(3)
      }
    } catch (error) {
      console.error("Error selecting estimate:", error)
    } finally {
      setSelectingEstimate(false)
    }
  }

  const generatePDFContent = (estimate: EstimatePlan) => {
    const currentDate = new Date().toLocaleDateString()

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Project Estimate - ${estimate.name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
            margin: 0;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: #1f2937;
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .client-info {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            border-left: 4px solid #1f2937;
        }
        
        .estimate-title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .price-section {
            background: #1f2937;
            color: white;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            margin: 30px 0;
        }
        
        .price {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .timeline {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .section {
            margin: 30px 0;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .feature-item {
            display: flex;
            align-items: flex-start;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #1f2937;
        }
        
        .feature-icon {
            color: #10b981;
            font-weight: bold;
            font-size: 16px;
            margin-right: 12px;
            margin-top: 2px;
        }
        
        .feature-text {
            font-size: 14px;
            color: #4b5563;
            line-height: 1.5;
        }
        
        .tech-stack {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .tech-item {
            background: #1f2937;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
        }
        
        .description-section {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
        }
        
        .description-text {
            color: #92400e;
            font-size: 15px;
            line-height: 1.6;
        }
        
        .footer {
            background: #1f2937;
            color: white;
            padding: 30px 40px;
            text-align: center;
            margin-top: 40px;
        }
        
        .footer-text {
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 10px;
        }
        
        .contact-info {
            font-size: 16px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">FreelanceFlow</div>
            <div class="subtitle">Professional Project Estimates</div>
        </div>
        
        <div class="content">
            <div class="client-info">
                <h3 style="margin-bottom: 10px; color: #1f2937;">Client Information</h3>
                <p><strong>Name:</strong> ${selectedClient?.name}</p>
                <p><strong>Company:</strong> ${selectedClient?.company || "Individual"}</p>
                <p><strong>Email:</strong> ${selectedClient?.email}</p>
                <p><strong>Project:</strong> ${selectedProject?.name}</p>
            </div>
            
            <h1 class="estimate-title">${estimate.name}</h1>
            
            <div class="price-section">
                <div class="price">$${estimate.price.toLocaleString()}</div>
                <div class="timeline">${estimate.timeline}</div>
            </div>
            
            <div class="description-section">
                <div class="description-text">${estimate.description}</div>
            </div>
            
            <div class="section">
                <h2 class="section-title">Project Features</h2>
                <div class="features-grid">
                    ${estimate.features
                      .map(
                        (feature) => `
                        <div class="feature-item">
                            <div class="feature-icon">✓</div>
                            <div class="feature-text">${feature}</div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">Technology Stack</h2>
                <div class="tech-stack">
                    ${estimate.techStack
                      .map(
                        (tech) => `
                        <div class="tech-item">${tech}</div>
                    `,
                      )
                      .join("")}
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">Project Description</h2>
                <div class="description-section">
                    <div class="description-text">${selectedProject?.description}</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-text">Generated on ${currentDate}</div>
            <div class="contact-info">FreelanceFlow - Professional Development Services</div>
        </div>
    </div>
</body>
</html>`
  }

  const downloadPDF = async (estimate: EstimatePlan) => {
    const htmlContent = generatePDFContent(estimate)

    // Create a temporary window to print the content
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Please allow popups to download PDF")
      return
    }

    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Wait for the content to load
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        // Note: The user will need to select "Save as PDF" in the print dialog
        // and manually change the filename extension to .pdf if needed
        printWindow.close()
      }, 100)
    }
  }

  const resetToSelection = () => {
    setStep(1)
    setSelectedClient(null)
    setSelectedProject(null)
    setProjects([])
    setEstimates([])
    setSelectedEstimate(null)
    setExistingEstimates([])
    setShowExistingOnly(false)
    setHasSelectedEstimate(false)
  }

  // Show authentication error if no token
  const showAuthError = () => {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Authentication Required</div>
          <p className="text-red-700">Please login to access the estimate generator.</p>
        </div>
      </div>
    )
  }

  // Check if user is authenticated
  try {
    getAuthToken()
  } catch (error) {
    return showAuthError()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">AI-Powered Estimate Generator</h2>
          <div className="text-sm text-gray-500">Step {step} of 3</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-slate-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Step 1: Select Client and Project */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Select Client & Project</h3>
          <div className="space-y-6">
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Client *</label>
              {loadingClients ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
                  <span className="ml-2 text-gray-600">Loading clients...</span>
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No clients found. Please add clients first in the Client Management section.
                </div>
              ) : (
                <select
                  value={selectedClient?.id || ""}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  required
                >
                  <option value="">Choose a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.company && `(${client.company})`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Project Selection */}
            {selectedClient && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Project *</label>
                {loadingProjects ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
                    <span className="ml-2 text-gray-600">Loading projects...</span>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No projects found for this client. Please add projects first in the Client Management section.
                  </div>
                ) : (
                  <select
                    value={selectedProject?.id || ""}
                    onChange={(e) => handleProjectSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    required
                  >
                    <option value="">Choose a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} - {project.status}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Existing Estimates Check */}
            {selectedProject && checkingExistingEstimates && (
              <div className="flex items-center justify-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <span className="ml-2 text-yellow-700">Checking for existing estimates...</span>
              </div>
            )}

            {/* Project Details */}
            {selectedProject &&
              !checkingExistingEstimates &&
              existingEstimates.length === 0 &&
              !hasSelectedEstimate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Project Details</h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Name:</span> {selectedProject.name}
                    </p>
                    {selectedProject.industry && (
                      <p>
                        <span className="font-medium">Industry:</span> {selectedProject.industry}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Status:</span>
                      <span
                        className={`ml-1 px-2 py-1 rounded-full text-xs ${
                          selectedProject.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : selectedProject.status === "Completed"
                              ? "bg-blue-100 text-blue-800"
                              : selectedProject.status === "On Hold"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {selectedProject.status}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">Description:</span> {selectedProject.description}
                    </p>
                    {selectedProject.createdAt && (
                      <p>
                        <span className="font-medium">Created:</span>{" "}
                        {new Date(selectedProject.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

            {/* Generate button - only show if no existing estimates or user chooses to generate new */}
            {selectedProject &&
              !checkingExistingEstimates &&
              existingEstimates.length === 0 &&
              !hasSelectedEstimate && (
                <div className="flex justify-end">
                  <button
                    onClick={generateNewEstimates}
                    disabled={loading || savingEstimates}
                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {(loading || savingEstimates) && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    {loading
                      ? "Generating Estimates..."
                      : savingEstimates
                        ? "Saving Estimates..."
                        : "Generate AI Estimates"}
                  </button>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Step 2: Review Estimates */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {showExistingOnly ? "Existing Estimates" : "Generated Estimates"}
              </h3>
              {showExistingOnly && (
                <button
                  onClick={generateNewEstimates}
                  disabled={loading || savingEstimates}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                >
                  {(loading || savingEstimates) && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {loading ? "Generating..." : savingEstimates ? "Saving..." : "Generate New Estimates"}
                </button>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Client:</span> {selectedClient?.name} (
                {selectedClient?.company || "Individual"})
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Project:</span> {selectedProject?.name}
              </p>
            </div>
            <p className="text-gray-600 mb-6">
              {showExistingOnly
                ? "These are the existing estimates for this project. You can select one or generate new estimates."
                : "Review the AI-generated estimates and select the one that best fits this project:"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {estimates.map((estimate, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-slate-300 transition-colors"
              >
                <div className="p-6">
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
                      {estimate.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-6">
                    <h5 className="font-medium text-gray-900 mb-2">Tech Stack:</h5>
                    <div className="flex flex-wrap gap-2">
                      {estimate.techStack.map((tech, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => selectEstimate(estimate)}
                      disabled={selectingEstimate}
                      className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {selectingEstimate ? "Selecting..." : "Select Plan"}
                    </button>
                    <button
                      onClick={() => downloadPDF(estimate)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-gray-50"
                    >
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back to Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Final Review */}
      {step === 3 && selectedEstimate && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Final Review</h3>

            {/* Client & Project Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p>
                    <span className="font-medium">Client:</span> {selectedClient?.name}
                  </p>
                  <p>
                    <span className="font-medium">Company:</span> {selectedClient?.company || "Individual"}
                  </p>
                </div>
                <div>
                  <p>
                    <span className="font-medium">Project:</span> {selectedProject?.name}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span> {selectedProject?.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-xl font-medium text-gray-900">{selectedEstimate.name}</h4>
                <div className="text-right">
                  <div className="text-3xl font-bold text-slate-900">${selectedEstimate.price.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">{selectedEstimate.timeline}</div>
                </div>
              </div>
              <p className="text-gray-700 mb-4">{selectedEstimate.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Features Included:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {selectedEstimate.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Technology Stack:</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedEstimate.techStack.map((tech, idx) => (
                      <span key={idx} className="px-2 py-1 bg-white border text-gray-700 text-xs rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="font-medium text-gray-900 mb-4">Next Steps</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                  1
                </span>
                Download the estimate as a branded PDF
              </div>
              <div className="flex items-center">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                  2
                </span>
                Create project plan with payment milestones
              </div>
              <div className="flex items-center">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                  3
                </span>
                Send to client for approval
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between space-x-4">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back to Estimates
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => downloadPDF(selectedEstimate)}
                  className="px-6 py-2 border border-slate-600 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
                >
                  Download PDF
                </button>
                <button
                  onClick={resetToSelection}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
                >
                  Create New Estimate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
