import  Project  from "../models/ProjectSchema.js";
 // Assuming you have a Client model
import jwt from "jsonwebtoken";
import { client } from "../models/clientModel.js";
import Estimate from "../models/EstimateModel.js";

// Helper function to get user ID from JWT token

// GET all projects for a specific client
export const getAllProjects = async (req, res) => {
  try {
    const { clientId } = req.params;
    const userId = req.user.id; // Assuming user ID is stored in req.user after authentication
    
    // Validate if client exists and belongs to the user
    const Client = await client.findOne({ _id: clientId, userId });
    if (!Client) {
      return res.status(404).json({
        success: false,
        message: "Client not found or you don't have permission to access it"
      });
    }

    const projects = await Project.find({ 
      clientId, 
      userId 
    })
    .populate('clientId', 'name company')
    .populate('estimateId')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: projects,
      count: projects.length
    });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
      error: error.message
    });
  }
};

// POST create a new project
export const addProject = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const userId = req.user.id; // Assuming user ID is stored in req.user after authentication
    // Validate if client exists and belongs to the user
    const Client = await client.findOne({ userId: userId,_id:clientId });
    if (!Client) {
      return res.status(404).json({
        success: false,
        message: "Client not found or you don't have permission to access it"
      });
    }

    // Extract project data from request body
    const {
      title, // Frontend sends 'title', but schema expects 'name'
      name,
      status,
      description,
    } = req.body;

    // Use title as name if name is not provided (for frontend compatibility)
    const projectName = name || title;

    if (!projectName) {
      return res.status(400).json({
        success: false,
        message: "Project name/title is required"
      });
    }

    // Set default dates if not provided
    const defaultStartDate =  new Date();

    // Generate unique project number

    // Map frontend status values to schema enum values
    const statusMapping = {
      'Active': 'active',
      'Completed': 'completed',
      'On Hold': 'on_hold',
      'Cancelled': 'cancelled'
    };
    
    const mappedStatus = statusMapping[status] || status.toLowerCase();

    const newProject = new Project({
      name: projectName,
      description: description || '',
      clientId,
      userId,
      status: mappedStatus,

      startDate: defaultStartDate,
    });

    const savedProject = await newProject.save();

    // Update client's project count
    await client.findByIdAndUpdate(
      clientId,
      { $inc: { projects: 1 } }
    );

    // Populate client data before sending response
    const populatedProject = await Project.findById(savedProject._id)
      .populate('clientId', 'name company');

    // Format response to match frontend expectations
    const responseProject = {
      id: populatedProject._id,
      title: populatedProject.name,
      name: populatedProject.name,
      description: populatedProject.description,
      status: populatedProject.status.charAt(0).toUpperCase() + populatedProject.status.slice(1).replace('_', ' '),
      createdAt: populatedProject.createdAt.toISOString().split('T')[0],
      totalAmount: populatedProject.totalAmount,
      currency: populatedProject.currency,
      priority: populatedProject.priority,
      startDate: populatedProject.startDate,
      endDate: populatedProject.endDate,
      projectNumber: populatedProject.projectNumber,
      client: populatedProject.clientId
    };

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: responseProject
    });

  } catch (error) {
    console.error('Create project error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Project number already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create project",
      error: error.message
    });
  }
};

// PUT update a project
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserIdFromToken(req);
    
    // Find project and verify ownership
    const existingProject = await Project.findOne({ _id: id, userId });
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found or you don't have permission to update it"
      });
    }

    const updateData = { ...req.body };
    
    // Handle title/name mapping
    if (updateData.title && !updateData.name) {
      updateData.name = updateData.title;
    }

    // Map frontend status values to schema enum values
    if (updateData.status) {
      const statusMapping = {
        'Active': 'active',
        'Completed': 'completed',
        'On Hold': 'on_hold',
        'Cancelled': 'cancelled'
      };
      updateData.status = statusMapping[updateData.status] || updateData.status.toLowerCase();
    }

    // Update timestamps
    updateData.updatedAt = new Date();

    // If project is being marked as completed, set actualEndDate
    if (updateData.status === 'completed' && !existingProject.actualEndDate) {
      updateData.actualEndDate = new Date();
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('clientId', 'name company');

    // Format response to match frontend expectations
    const responseProject = {
      id: updatedProject._id,
      title: updatedProject.name,
      name: updatedProject.name,
      description: updatedProject.description,
      status: updatedProject.status.charAt(0).toUpperCase() + updatedProject.status.slice(1).replace('_', ' '),
      createdAt: updatedProject.createdAt.toISOString().split('T')[0],
      totalAmount: updatedProject.totalAmount,
      currency: updatedProject.currency,
      priority: updatedProject.priority,
      startDate: updatedProject.startDate,
      endDate: updatedProject.endDate,
      actualEndDate: updatedProject.actualEndDate,
      projectNumber: updatedProject.projectNumber,
      client: updatedProject.clientId
    };

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: responseProject
    });

  } catch (error) {
    console.error('Update project error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update project",
      error: error.message
    });
  }
};

// DELETE a project
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId =req.user.id;
    
    // Find project and verify ownership
    const project = await Project.findOne({ _id: id, userId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or you don't have permission to delete it"
      });
    }

    // Delete the project
    await Project.findByIdAndDelete(id);
    await Estimate.deleteMany({ projectId: id });
    // Update client's project count
    await client.findByIdAndUpdate(
      project.clientId,
      { $inc: { projects: -1 } }
    );

    res.status(200).json({
      success: true,
      message: "Project deleted successfully"
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to delete project",
      error: error.message
    });
  }
};