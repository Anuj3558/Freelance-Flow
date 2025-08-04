"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Cookies from "js-cookie";
export default function IntegratedProjectFlow() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingClients, setLoadingClients] = useState(true);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingEstimates, setLoadingEstimates] = useState(false);
    const [generatingMilestones, setGeneratingMilestones] = useState(false);
    // API Data
    const [clients, setClients] = useState([]);
    const [projects, setProjects] = useState([]);
    const [estimates, setEstimates] = useState([]);
    // Selected Data
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedEstimate, setSelectedEstimate] = useState(null);
    // Project Configuration
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    // Generated Milestones
    const [generatedMilestones, setGeneratedMilestones] = useState([]);
    const [projectWithMilestones, setProjectWithMilestones] = useState(null);
    // API URLs
    const API_URL = "http://localhost:5000/api/clients";
    const ESTIMATES_API_URL = "http://localhost:5000/api/estimates";
    const MILESTONES_API_URL = "http://localhost:5000/api/milestones";
    // Get JWT token from cookies
    const getAuthToken = () => {
        const token = Cookies.get("jwt_token");
        if (!token) {
            alert("Authentication Error: Please login to continue");
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
    // Fetch clients
    const fetchClients = async () => {
        try {
            const data = await authFetch(API_URL + "/get-all-clients");
            return Array.isArray(data) ? data : [];
        }
        catch (error) {
            console.error("Error fetching clients:", error);
            return [];
        }
    };
    // Fetch projects by client
    const fetchProjectsByClient = async (clientId) => {
        try {
            const response = await authFetch(`${API_URL}/get-client-projects/${clientId}`);
            return Array.isArray(response.data) ? response.data : [];
        }
        catch (error) {
            console.error("Error fetching projects:", error);
            return [];
        }
    };
    // Fetch estimates by project
    const fetchEstimatesByProject = async (projectId) => {
        try {
            const response = await authFetch(`${ESTIMATES_API_URL}/all-estimates/${projectId}`);
            return Array.isArray(response.data) ? response.data : [];
        }
        catch (error) {
            console.error("Error fetching estimates:", error);
            alert(`Failed to load estimates: ${error instanceof Error ? error.message : "Unknown error"}`);
            return [];
        }
    };
    // Generate AI milestones
    const generateMilestonesWithAI = async () => {
        if (!selectedEstimate || !selectedProject || !selectedClient || !startDate || !endDate) {
            alert("Please fill in all required fields");
            return;
        }
        setGeneratingMilestones(true);
        try {
            // Initialize the Gemini API
            const genAI = new GoogleGenerativeAI("AIzaSyDEW-XA8JW-x4WpZS6n5gGA584584Xgf1k");
            const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
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
      `;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            // Extract JSON from the response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const aiMilestones = JSON.parse(jsonMatch[0]);
                // Convert to our milestone format
                const milestones = aiMilestones.map((milestone, index) => ({
                    id: Date.now() + index,
                    name: milestone.name,
                    description: milestone.description,
                    percentage: milestone.percentage,
                    amount: Math.round((milestone.percentage / 100) * selectedEstimate.price),
                    dueDate: milestone.dueDate,
                    status: "Pending",
                }));
                setGeneratedMilestones(milestones);
                // Create project with milestones
                const newProject = {
                    id: Date.now(),
                    name: selectedProject.name,
                    client: selectedClient.name,
                    totalAmount: selectedEstimate.price,
                    createdDate: new Date().toISOString().split("T")[0],
                    startDate: startDate,
                    endDate: endDate,
                    selectedEstimate: selectedEstimate,
                    milestones: milestones,
                };
                setProjectWithMilestones(newProject);
                // Save milestones to backend
                await saveMilestonesToBackend(milestones, selectedProject.id, selectedClient.id, selectedEstimate._id || selectedEstimate.id);
                setStep(5); // Go to final review
            }
            else {
                throw new Error("Failed to parse milestones");
            }
        }
        catch (error) {
            console.error("Error generating milestones:", error);
            alert("Failed to generate milestones. Please try again.");
        }
        finally {
            setGeneratingMilestones(false);
        }
    };
    // Save milestones to backend
    const saveMilestonesToBackend = async (milestones, projectId, clientId, estimateId) => {
        try {
            const milestonesWithProjectInfo = milestones.map((milestone) => ({
                ...milestone,
                projectId,
                clientId,
                estimateId,
                createdAt: new Date().toISOString(),
            }));
            console.log(milestonesWithProjectInfo);
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
            });
            console.log("Milestones saved successfully:", response);
            return response.success === true;
        }
        catch (error) {
            console.error("Error saving milestones:", error);
            // Don't show alert here as it's called after successful generation
            return false;
        }
    };
    // Load clients on component mount
    useEffect(() => {
        const loadClients = async () => {
            try {
                const clientData = await fetchClients();
                setClients(clientData);
            }
            catch (error) {
                console.error("Error loading clients:", error);
            }
            finally {
                setLoadingClients(false);
            }
        };
        loadClients();
    }, []);
    // Handle client selection
    const handleClientSelect = async (clientId) => {
        const client = clients.find((c) => c.id === clientId);
        if (!client)
            return;
        setSelectedClient(client);
        setSelectedProject(null);
        setSelectedEstimate(null);
        setEstimates([]);
        setLoadingProjects(true);
        try {
            const projectData = await fetchProjectsByClient(clientId);
            const filteredProjects = projectData.filter((p) => p.milestones.length === 0);
            console.log("Filtered Projects:", filteredProjects);
            setProjects(filteredProjects);
        }
        catch (error) {
            console.error("Error fetching projects:", error);
            setProjects([]);
        }
        finally {
            setLoadingProjects(false);
        }
    };
    // Handle project selection
    const handleProjectSelect = async (projectId) => {
        const project = projects.find((p) => p.id === projectId);
        if (!project)
            return;
        setSelectedProject(project);
        setSelectedEstimate(null);
        setLoadingEstimates(true);
        try {
            const estimateData = await fetchEstimatesByProject(projectId);
            const selectedEstimates = estimateData.filter((e) => e.isSelected === true);
            if (selectedEstimates.length === 1) {
                // If only one selected estimate exists, use it and skip to timeline step
                setSelectedEstimate(selectedEstimates[0]);
                setStep(4); // Skip directly to timeline step
            }
            else {
                // Show all estimates if none or multiple are selected
                setEstimates(estimateData);
                setStep(3); // Go to estimate selection step
            }
        }
        catch (error) {
            console.error("Error fetching estimates:", error);
            setEstimates([]);
        }
        finally {
            setLoadingEstimates(false);
        }
    };
    // Handle estimate selection
    const handleEstimateSelect = (estimateId) => {
        const estimate = estimates.find((e) => (e._id || e.id) === estimateId);
        if (estimate) {
            setSelectedEstimate(estimate);
        }
    };
    // Calculate progress based on steps
    const getProgressPercentage = () => {
        return (step / 5) * 100;
    };
    // Reset workflow
    const resetWorkflow = () => {
        setStep(1);
        setSelectedClient(null);
        setSelectedProject(null);
        setSelectedEstimate(null);
        setStartDate("");
        setEndDate("");
        setGeneratedMilestones([]);
        setProjectWithMilestones(null);
        setProjects([]);
        setEstimates([]);
    };
    return (_jsxs("div", { className: "max-w-6xl mx-auto space-y-6 p-4", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Project Setup & Milestone Generator" }), _jsxs("div", { className: "text-sm text-gray-500", children: ["Step ", step, " of 5"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-slate-600 h-2 rounded-full transition-all duration-300", style: { width: `${getProgressPercentage()}%` } }) }), _jsxs("div", { className: "flex justify-between text-xs text-gray-500 mt-2", children: [_jsx("span", { className: step >= 1 ? "text-slate-600 font-medium" : "", children: "Select Client" }), _jsx("span", { className: step >= 2 ? "text-slate-600 font-medium" : "", children: "Choose Project" }), _jsx("span", { className: step >= 3 ? "text-slate-600 font-medium" : "", children: "Pick Estimate" }), _jsx("span", { className: step >= 4 ? "text-slate-600 font-medium" : "", children: "Set Timeline" }), _jsx("span", { className: step >= 5 ? "text-slate-600 font-medium" : "", children: "Review & Generate" })] })] }), step === 1 && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 mb-4", children: "Step 1: Select Client" }), loadingClients ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Loading clients..." })] })) : clients.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No clients found. Please add clients first in the Client Management section." })) : (_jsx(_Fragment, { children: _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: clients.map((client) => (_jsx("div", { onClick: () => {
                                    handleClientSelect(client.id);
                                    setStep(2);
                                }, className: "p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "p-2 bg-slate-100 rounded-lg", children: _jsx("span", { className: "text-xl", children: "\uD83D\uDC64" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h4", { className: "font-medium text-gray-900 truncate", children: client.name }), _jsx("p", { className: "text-sm text-gray-600 truncate", children: client.company || "Individual" }), _jsx("p", { className: "text-xs text-gray-500 truncate", children: client.email })] })] }) }, client.id))) }) }))] })), step === 2 && selectedClient && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Step 2: Select Project" }), _jsx("button", { onClick: () => setStep(1), className: "text-slate-600 hover:text-slate-800 text-sm", children: "\u2190 Change Client" })] }), _jsx("div", { className: "bg-gray-50 rounded-lg p-4 mb-4", children: _jsxs("p", { className: "text-sm text-gray-600", children: [_jsx("span", { className: "font-medium", children: "Selected Client:" }), " ", selectedClient.name, " (", selectedClient.company || "Individual", ")"] }) }), loadingProjects ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Loading projects..." })] })) : projects.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No projects found for this client. Please add projects first in the Client Management section." })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: projects.map((project) => (_jsx("div", { onClick: () => {
                                handleProjectSelect(project.id);
                                setStep(3);
                            }, className: "p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors", children: _jsxs("div", { className: "flex items-start space-x-3", children: [_jsx("div", { className: "p-2 bg-green-100 rounded-lg", children: _jsx("span", { className: "text-xl", children: "\uD83D\uDCCB" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h4", { className: "font-medium text-gray-900", children: project.name }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: project.description }), _jsxs("div", { className: "flex items-center justify-between mt-2", children: [_jsx("span", { className: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${project.status === "Active"
                                                            ? "bg-green-100 text-green-800"
                                                            : project.status === "Completed"
                                                                ? "bg-blue-100 text-blue-800"
                                                                : project.status === "On Hold"
                                                                    ? "bg-yellow-100 text-yellow-800"
                                                                    : "bg-gray-100 text-gray-800"}`, children: project.status }), project.industry && _jsx("span", { className: "text-xs text-gray-500", children: project.industry })] })] })] }) }, project.id))) }))] })), step === 3 && selectedProject && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Step 3: Select Estimate Plan" }), _jsx("button", { onClick: () => setStep(2), className: "text-slate-600 hover:text-slate-800 text-sm", children: "\u2190 Change Project" })] }), _jsx("div", { className: "bg-gray-50 rounded-lg p-4 mb-4", children: _jsxs("p", { className: "text-sm text-gray-600", children: [_jsx("span", { className: "font-medium", children: "Selected Project:" }), " ", selectedProject.name] }) }), loadingEstimates ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Loading estimates..." })] })) : estimates.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No estimates found for this project. Please generate estimates first in the Estimate Generator section." })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: estimates.map((estimate) => (_jsxs("div", { onClick: () => {
                                handleEstimateSelect(estimate._id || estimate.id);
                                setStep(4);
                            }, className: "p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsx("h4", { className: "text-xl font-medium text-gray-900", children: estimate.name }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "text-2xl font-bold text-slate-900", children: ["$", estimate.price.toLocaleString()] }), _jsx("div", { className: "text-sm text-gray-500", children: estimate.timeline })] })] }), _jsx("p", { className: "text-gray-600 mb-4", children: estimate.description }), _jsxs("div", { className: "mb-4", children: [_jsx("h5", { className: "font-medium text-gray-900 mb-2", children: "Key Features:" }), _jsxs("ul", { className: "text-sm text-gray-600 space-y-1", children: [estimate.features.slice(0, 3).map((feature, idx) => (_jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "text-green-500 mr-2", children: "\u2713" }), feature] }, idx))), estimate.features.length > 3 && (_jsxs("li", { className: "text-xs text-gray-500", children: ["+ ", estimate.features.length - 3, " more features"] }))] })] }), _jsxs("div", { children: [_jsx("h5", { className: "font-medium text-gray-900 mb-2", children: "Tech Stack:" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [estimate.techStack.slice(0, 4).map((tech, idx) => (_jsx("span", { className: "px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded", children: tech }, idx))), estimate.techStack.length > 4 && (_jsxs("span", { className: "px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded", children: ["+", estimate.techStack.length - 4] }))] })] })] }, estimate._id || estimate.id))) }))] })), step === 4 && selectedEstimate && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Step 4: Set Project Timeline" }), _jsx("button", { onClick: () => setStep(3), className: "text-slate-600 hover:text-slate-800 text-sm", children: "\u2190 Change Estimate" })] }), _jsx("div", { className: "bg-gray-50 rounded-lg p-4 mb-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Client:" }), " ", selectedClient?.name] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Project:" }), " ", selectedProject?.name] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Estimate:" }), " ", selectedEstimate.name, " ($", selectedEstimate.price.toLocaleString(), ")"] })] }) }), _jsxs("div", { className: "max-w-md mx-auto space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Project Start Date *" }), _jsx("input", { type: "date", value: startDate, onChange: (e) => setStartDate(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Project End Date *" }), _jsx("input", { type: "date", value: endDate, onChange: (e) => setEndDate(e.target.value), min: startDate, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500", required: true })] }), startDate && endDate && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h4", { className: "font-medium text-gray-900 mb-2", children: "Project Duration" }), _jsxs("p", { className: "text-sm text-gray-600", children: [Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)), " ", "days (", selectedEstimate.timeline, " estimated)"] })] })), _jsx("div", { className: "flex justify-center pt-4", children: _jsxs("button", { onClick: generateMilestonesWithAI, disabled: generatingMilestones || !startDate || !endDate, className: "px-8 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center", children: [generatingMilestones && (_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" })), generatingMilestones ? "Generating Milestones..." : "Generate AI Milestones"] }) })] })] })), step === 5 && projectWithMilestones && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 mb-4", children: "Step 5: Review Generated Milestones" }), _jsx("div", { className: "bg-gray-50 rounded-lg p-4 mb-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Client:" }), " ", projectWithMilestones.client] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Project:" }), " ", projectWithMilestones.name] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Total Amount:" }), " $", projectWithMilestones.totalAmount.toLocaleString()] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Timeline:" }), " ", startDate, " to ", endDate] })] }) }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6", children: [_jsxs("h4", { className: "font-medium text-gray-900 mb-2", children: ["Selected Estimate: ", projectWithMilestones.selectedEstimate?.name] }), _jsx("p", { className: "text-sm text-gray-600 mb-3", children: projectWithMilestones.selectedEstimate?.description }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("h5", { className: "font-medium text-gray-900 mb-1", children: "Key Features:" }), _jsx("ul", { className: "text-sm text-gray-600 space-y-1", children: projectWithMilestones.selectedEstimate?.features.slice(0, 3).map((feature, idx) => (_jsxs("li", { children: ["\u2022 ", feature] }, idx))) })] }), _jsxs("div", { children: [_jsx("h5", { className: "font-medium text-gray-900 mb-1", children: "Technology:" }), _jsx("div", { className: "flex flex-wrap gap-1", children: projectWithMilestones.selectedEstimate?.techStack.map((tech, idx) => (_jsx("span", { className: "px-2 py-1 bg-white border text-gray-700 text-xs rounded", children: tech }, idx))) })] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h4", { className: "font-medium text-gray-900", children: "AI-Generated Payment Milestones" }), projectWithMilestones.milestones.map((milestone) => (_jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h5", { className: "font-medium text-gray-900", children: milestone.name }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: milestone.description })] }), _jsxs("div", { className: "text-right ml-4", children: [_jsxs("p", { className: "text-lg font-semibold text-gray-900", children: ["$", milestone.amount.toLocaleString()] }), _jsxs("p", { className: "text-sm text-gray-500", children: [milestone.percentage, "%"] })] })] }), _jsx("div", { className: "flex justify-between items-center", children: _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("span", { className: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${milestone.status === "Pending" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`, children: milestone.status }), _jsxs("span", { className: "text-sm text-gray-500", children: ["Due: ", new Date(milestone.dueDate).toLocaleDateString()] })] }) })] }, milestone.id)))] }), _jsxs("div", { className: "flex justify-between pt-6", children: [_jsx("button", { onClick: () => setStep(4), className: "px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50", children: "\u2190 Back to Timeline" }), _jsxs("div", { className: "space-x-3", children: [_jsx("button", { onClick: resetWorkflow, className: "px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50", children: "Start New Project" }), _jsx("button", { onClick: () => {
                                                    // Implement save functionality
                                                    alert("Project and milestones saved successfully!");
                                                    resetWorkflow();
                                                }, className: "px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800", children: "Save & Finish" })] })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsx("h4", { className: "font-medium text-gray-900 mb-4", children: "Project Financial Summary" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("div", { className: "bg-gray-50 p-4 rounded-lg", children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Total Project Value" }), _jsxs("p", { className: "text-2xl font-semibold text-gray-900", children: ["$", projectWithMilestones.totalAmount.toLocaleString()] })] }), _jsxs("div", { className: "bg-blue-50 p-4 rounded-lg", children: [_jsx("p", { className: "text-sm font-medium text-blue-600", children: "Milestones Created" }), _jsx("p", { className: "text-2xl font-semibold text-blue-900", children: projectWithMilestones.milestones.length })] }), _jsxs("div", { className: "bg-green-50 p-4 rounded-lg", children: [_jsx("p", { className: "text-sm font-medium text-green-600", children: "Estimated Completion" }), _jsx("p", { className: "text-2xl font-semibold text-green-900", children: new Date(projectWithMilestones.endDate).toLocaleDateString() })] })] })] })] }))] }));
}
