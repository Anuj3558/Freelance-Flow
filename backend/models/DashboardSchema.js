import mongoose from "mongoose";

// Analytics/Dashboard Stats Schema (for caching dashboard data)
const dashboardStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  totalClients: {
    type: Number,
    default: 0
  },
  activeClients: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalExpenses: {
    type: Number,
    default: 0
  },
  completedProjects: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create the Dashboard model


// Static method to update dashboard stats
dashboardStatsSchema.statics.updateDashboardStats = async function(userId) {
  const Client = mongoose.model('Client');
  const Project = mongoose.model('Project');
  const Milestone = mongoose.model('Milestone');
  const Expense = mongoose.model('Expense');
  const Estimate = mongoose.model('Estimate');
  try {
    // Calculate stats
    const projects = await Project.find({ userId });
    let totalRevenue = 0;
    for (const project of projects) {
      const estimates = await Estimate.find({ projectId: project._id, isSelected: true });
      for (const estimate of estimates) {
        totalRevenue += estimate.price || 0;
      }
    }

    const [
      totalClients,
      activeClients,
      totalExpenses,
      activeProjects,
      completedProjects
    ] = await Promise.all([
      Client.countDocuments({ userId }),
      Client.countDocuments({ userId, status: 'Active' }),
      Expense.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0),
      Project.countDocuments({ userId }),
      Project.countDocuments({ userId, status: 'completed' })
    ]);

    // Update or create dashboard stats
    return await this.findOneAndUpdate(
      { userId },
      {
        totalClients,
        activeClients,
        totalRevenue,
        totalExpenses,
        activeProjects,
        completedProjects,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error updating dashboard stats:', error);
    throw error;
  }
};
const Dashboard = mongoose.model('Dashboard', dashboardStatsSchema);
export { Dashboard };