import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Estimate from "../models/EstimateModel.js";

// Import your models (adjust paths as needed)
// import Project from "../models/Project.js";
// import estimatePlanSchema from "../models/Estimate.js";

// Create the Estimate model from the schema

// Helper function to verify JWT token and get user ID

// Controller to add/save all estimates for a project (bulk save)
export const AddAllEstimate = async (req, res) => {
  try {
    // Verify authentication
    const userId = req.user.id;
    const projectId = req.params.id;
    const { estimates, clientId } = req.body;

    // Validate input
    if (!estimates || !Array.isArray(estimates) || estimates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Estimates array is required and cannot be empty"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    // Verify project exists and belongs to the user
    // const project = await Project.findOne({ _id: projectId, userId });
    // if (!project) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Project not found or access denied"
    //   });
    // }

    // Check if estimates already exist for this project
    const existingEstimates = await Estimate.find({ projectId });
    if (existingEstimates.length > 0) {
      // Option 1: Delete existing estimates and create new ones
      await Estimate.deleteMany({ projectId });
      
      // Option 2: Return error if estimates already exist
      // return res.status(409).json({
      //   success: false,
      //   message: "Estimates already exist for this project"
      // });
    }

    // Prepare estimates for saving
    const estimatesToSave = estimates.map(estimate => ({
      projectId,
      name: estimate.name,
      description: estimate.description,
      timeline: estimate.timeline,
      price: estimate.price,
      features: estimate.features || [],
      techStack: estimate.techStack || [],
      isSelected: false
    }));

    // Validate each estimate
    for (const estimate of estimatesToSave) {
      if (!estimate.name || !estimate.description || !estimate.timeline || estimate.price == null) {
        return res.status(400).json({
          success: false,
          message: "Each estimate must have name, description, timeline, and price"
        });
      }
      
      if (estimate.price < 0) {
        return res.status(400).json({
          success: false,
          message: "Price cannot be negative"
        });
      }
    }

    // Save all estimates
    const savedEstimates = await Estimate.insertMany(estimatesToSave);

    res.status(201).json({
      success: true,
      message: `${savedEstimates.length} estimates saved successfully`,
      data: savedEstimates
    });

  } catch (error) {
    console.error("Error in AddAllEstimate:", error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        details: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while saving estimates"
    });
  }
};

// Controller to get all estimates for a project
export const GetAllEstimates = async (req, res) => {
  try {
    // Verify authentication
    const userId = req.user.id;
    const projectId = req.params.id;

    // Validate project ID
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    // Verify project exists and belongs to the user
    // const project = await Project.findOne({ _id: projectId, userId });
    // if (!project) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Project not found or access denied"
    //   });
    // }

    // Get all estimates for the project
    const estimates = await Estimate.find({ projectId })
      .sort({ createdAt: -1 }) // Most recent first
      .lean(); // Convert to plain JavaScript objects for better performance

    // Add some computed fields
    const estimatesWithMetadata = estimates.map(estimate => ({
      ...estimate,
      formattedPrice: `$${estimate.price.toLocaleString()}`,
      featureCount: estimate.features.length,
      techCount: estimate.techStack.length
    }));

    res.status(200).json({
      success: true,
      message: `Found ${estimates.length} estimates`,
      count: estimates.length,
      data: estimatesWithMetadata
    });

  } catch (error) {
    console.error("Error in GetAllEstimates:", error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while fetching estimates"
    });
  }
};

// Controller to get/select a specific estimate by ID
export const SelectEstimateById = async (req, res) => {
    try {
        const userId = req.user.id;
        const estimateId = req.params.id;
        console.log(estimateId)
        if (!mongoose.Types.ObjectId.isValid(estimateId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid estimate ID"
            });
        }

        // Find the estimate and update isSelected to true
        const updatedEstimate = await Estimate.findByIdAndUpdate(
            estimateId,
            { isSelected: true },
            { new: true }
        );

        if (!updatedEstimate) {
            return res.status(404).json({
                success: false,
                message: "Estimate not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Estimate selected successfully",
            data: updatedEstimate
        });
    } catch (error) {
        console.error("Error in SelectEstimateById:", error);

        if (error.message === 'No token provided' || error.message === 'Invalid token') {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error while selecting estimate"
        });
    }
};

// Additional helper controller to get estimates summary for a project


// Controller to update an existing estimate

