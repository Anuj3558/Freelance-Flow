import Project from "../models/ProjectSchema.js";
import { validationResult } from "express-validator";

// Get all milestones for a specific client
export const getAllMilestones = async (req, res) => {
  try {
    const { clientId } = req.params;
    const userId = req.user._id;

    // Find all projects for the client that belong to the authenticated user
    const projects = await Project.find({ 
      clientId, 
      userId 
    }).populate('clientId', 'name email company');

    if (!projects || projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No projects found for this client"
      });
    }

    // Extract all milestones from all projects
    const allMilestones = [];
    projects.forEach(project => {
      project.milestones.forEach(milestone => {
        allMilestones.push({
          ...milestone.toObject(),
          projectId: project._id,
          projectName: project.name,
          clientName: project.clientId?.name,
          totalAmount: project.totalAmount
        });
      });
    });

    // Sort milestones by due date
    allMilestones.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Calculate summary statistics
    const summary = {
      total: allMilestones.length,
      pending: allMilestones.filter(m => m.status === 'Pending').length,
      paid: allMilestones.filter(m => m.status === 'Paid').length,
      overdue: allMilestones.filter(m => m.status === 'Overdue').length,
      totalValue: allMilestones.reduce((sum, m) => sum + m.amount, 0),
      pendingValue: allMilestones
        .filter(m => m.status === 'Pending')
        .reduce((sum, m) => sum + m.amount, 0)
    };

    res.status(200).json({
      success: true,
      data: allMilestones,
      summary,
      message: `Found ${allMilestones.length} milestones for client`
    });

  } catch (error) {
    console.error("Error fetching milestones:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching milestones",
      error: error.message
    });
  }
};

// Add a new milestone to a project
export const addMilestone = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { clientId } = req.params;
    const userId = req.user._id;
    console.log("Adding milestone for client:", clientId, "by user:", userId);
    const {
      projectId,
      name,
      description,
      percentage,
      amount,
      dueDate,
      status = 'Pending',
      paymentMethod,
      transactionId,
      notes
    } = req.body;

    // Validate required fields
    if (!projectId || !name || !percentage || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: projectId, name, percentage, amount, dueDate"
      });
    }

    // Find the project
    const project = await Project.findOne({
      _id: projectId,
      clientId,
      userId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied"
      });
    }

    // Validate percentage doesn't exceed 100% when combined with existing milestones

    // Create new milestone
    const newMilestone = {
      name,
      description,
      percentage,
      amount,
      dueDate: new Date(dueDate),
      status,
      paymentMethod,
      transactionId,
      notes
    };

    // If status is 'Paid', add payment date
    if (status === 'Paid') {
      newMilestone.paidDate = new Date();
    }

    // Add milestone to project
    project.milestones.push(newMilestone);
    await project.save();

    // Get the newly added milestone (last one in the array)
    const addedMilestone = project.milestones[project.milestones.length - 1];

    res.status(201).json({
      success: true,
      data: addedMilestone,
      message: "Milestone added successfully"
    });

  } catch (error) {
    console.error("Error adding milestone:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while adding milestone",
      error: error.message
    });
  }
};

// Update an existing milestone
export const updateMilestone = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { id: milestoneId } = req.params;
    const userId = req.user._id;

    // Find project containing the milestone
    const project = await Project.findOne({
      userId,
      'milestones._id': milestoneId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found or access denied"
      });
    }

    // Find the specific milestone
    const milestone = project.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found"
      });
    }
  //update its feild is achived to true
    await Project.updateOne(
      { userId: userId, 'milestones._id': milestoneId },
      { $set: { 'milestones.$.isAchived': true } }
    );
    // If updating percentage, validate it doesn't exceed 100%
   

    // Handle status change to 'Paid'
 

    // Handle status change from 'Paid' to something else


 

    // Update the project's updatedAt field
    project.updatedAt = new Date();

    await project.save();

    res.status(200).json({
      success: true,
      data: milestone,
      message: "Milestone updated successfully"
    });

  } catch (error) {
    console.error("Error updating milestone:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating milestone",
      error: error.message
    });
  }
};

// Delete a milestone
export const deleteMilestone = async (req, res) => {
  try {
    const { id: milestoneId } = req.params;
    const userId = req.user._id;

    // Find project containing the milestone
    const project = await Project.findOne({
      userId,
      'milestones._id': milestoneId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found or access denied"
      });
    }

    // Find the specific milestone to get its details before deletion
    const milestone = project.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found"
      });
    }

    // Check if milestone is already paid (optional business logic)
    if (milestone.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a paid milestone. Please contact support if needed."
      });
    }

    // Remove the milestone
    project.milestones.pull(milestone._id);
    project.updatedAt = new Date();
    await project.save();

    res.status(200).json({
      success: true,
      message: "Milestone deleted successfully",
      deletedMilestone: {
        id: milestone._id,
        name: milestone.name,
        amount: milestone.amount
      }
    });

  } catch (error) {
    console.error("Error deleting milestone:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting milestone",
      error: error.message
    });
  }
};

export const getAllMilestonesDirect = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all projects belonging to this user
    const projects = await Project.find({ userId })

    if (!projects || projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No projects found for this user"
      });
    }

    // Flatten milestones
    const allMilestones = [];


    // Sort by due date
    allMilestones.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.status(200).json({
      success: true,
      data: projects,
      message: "All milestones for the user fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching milestones:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching milestones",
      error: error.message
    });
  }
};
// Create multiple milestones (bulk creation) - for the AI generation feature
export const createMilestones = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      milestones,
      projectId,
      clientId,
      estimateId,
      startDate,
      endDate
    } = req.body;

    if (!milestones || !Array.isArray(milestones) || milestones.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Milestones array is required and cannot be empty"
      });
    }

    // Find the project
    const project = await Project.findOne({
      _id: projectId,
      clientId,
      userId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied"
      });
    }

    // Validate total percentage doesn't exceed 100%
    const totalPercentage = milestones.reduce((sum, m) => sum + (m.percentage || 0), 0);
    if (totalPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: `Total milestone percentages cannot exceed 100%. Current total: ${totalPercentage}%`
      });
    }

    // Clear existing milestones (optional - comment out if you want to add to existing)
    project.milestones = [];

    // Add all milestones
    milestones.forEach(milestone => {
      project.milestones.push({
        name: milestone.name,
        description: milestone.description,
        percentage: milestone.percentage,
        amount: milestone.amount,
        dueDate: new Date(milestone.dueDate),
        status: milestone.status || 'Pending',
        notes: milestone.notes
      });
    });

    // Update project with timeline and estimate info
    if (startDate) project.startDate = new Date(startDate);
    if (endDate) project.endDate = new Date(endDate);
    if (estimateId) project.estimateId = estimateId;

    project.updatedAt = new Date();
    await project.save();

    res.status(201).json({
      success: true,
      data: {
        project: {
          id: project._id,
          name: project.name,
          milestones: project.milestones
        },
        summary: {
          totalMilestones: project.milestones.length,
          totalAmount: project.milestones.reduce((sum, m) => sum + m.amount, 0),
          totalPercentage: project.milestones.reduce((sum, m) => sum + m.percentage, 0)
        }
      },
      message: `Successfully created ${milestones.length} milestones`
    });

  } catch (error) {
    console.error("Error creating milestones:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while creating milestones",
      error: error.message
    });
  }
};

// Get milestone statistics for dashboard
export const getMilestoneStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { clientId } = req.params;

    // Find all projects for the user (and optionally filter by client)
    const query = { userId };
    if (clientId) {
      query.clientId = clientId;
    }

    const projects = await Project.find(query).populate('clientId', 'name company');

    // Aggregate milestone statistics
    let stats = {
      totalMilestones: 0,
      pendingMilestones: 0,
      paidMilestones: 0,
      overdueMilestones: 0,
      totalValue: 0,
      pendingValue: 0,
      paidValue: 0,
      overdueValue: 0,
      upcomingMilestones: [],
      recentPayments: []
    };

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    projects.forEach(project => {
      project.milestones.forEach(milestone => {
        stats.totalMilestones++;
        stats.totalValue += milestone.amount;

        // Update milestone status if overdue
        if (milestone.status === 'Pending' && new Date(milestone.dueDate) < now) {
          milestone.status = 'Overdue';
        }

        // Count by status
        if (milestone.status === 'Pending') {
          stats.pendingMilestones++;
          stats.pendingValue += milestone.amount;
        } else if (milestone.status === 'Paid') {
          stats.paidMilestones++;
          stats.paidValue += milestone.amount;
          
          // Recent payments (last 30 days)
          if (milestone.paidDate && milestone.paidDate >= new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))) {
            stats.recentPayments.push({
              ...milestone.toObject(),
              projectName: project.name,
              clientName: project.clientId?.name
            });
          }
        } else if (milestone.status === 'Overdue') {
          stats.overdueMilestones++;
          stats.overdueValue += milestone.amount;
        }

        // Upcoming milestones (next 30 days)
        if (milestone.status === 'Pending' && new Date(milestone.dueDate) <= thirtyDaysFromNow) {
          stats.upcomingMilestones.push({
            ...milestone.toObject(),
            projectName: project.name,
            clientName: project.clientId?.name
          });
        }
      });
    });

    // Sort arrays
    stats.upcomingMilestones.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    stats.recentPayments.sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));

    // Limit arrays to most relevant items
    stats.upcomingMilestones = stats.upcomingMilestones.slice(0, 10);
    stats.recentPayments = stats.recentPayments.slice(0, 10);

    res.status(200).json({
      success: true,
      data: stats,
      message: "Milestone statistics retrieved successfully"
    });

  } catch (error) {
    console.error("Error fetching milestone stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching milestone statistics",
      error: error.message
    });
  }
};