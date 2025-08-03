// middleware/cascadeDeleteMiddleware.js
import mongoose from "mongoose";

// Mongoose Pre-Delete Middleware for Cascade Delete
const setupUserCascadeMiddleware = () => {
  try {
    // Get User model and add pre-delete middleware
    const User = mongoose.model('User');
    
    // Pre-delete middleware for various delete methods
    User.schema.pre(['findOneAndDelete', 'deleteOne', 'deleteMany'], async function() {
      try {
        // Import models (they should be loaded by now)
        const Dashboard = mongoose.model('Dashboard');
        const Revenue = mongoose.model('Revenue');
        const Expense = mongoose.model('Expense');
        
        // Get the user ID being deleted
        const userId = this.getQuery()._id;
        
        if (userId) {
          console.log(`Cascading delete for user: ${userId}`);
          
          // Delete related records in parallel
          const [dashboardResult, revenueResult, expenseResult] = await Promise.all([
            Dashboard.deleteMany({ userId }).catch(err => {
              console.warn('Dashboard model not found or error:', err.message);
              return { deletedCount: 0 };
            }),
            Revenue.deleteMany({ userId }).catch(err => {
              console.warn('Revenue model not found or error:', err.message);
              return { deletedCount: 0 };
            }),
            Expense.deleteMany({ userId }).catch(err => {
              console.warn('Expense model not found or error:', err.message);
              return { deletedCount: 0 };
            })
          ]);
          
          console.log(`User cascade delete completed:
            - Dashboard: ${dashboardResult.deletedCount} records
            - Revenue: ${revenueResult.deletedCount} records  
            - Expenses: ${expenseResult.deletedCount} records`);
        }
        
      } catch (error) {
        console.error('Error in user cascade delete middleware:', error);
        // Don't throw error to prevent blocking user deletion
      }
    });

    console.log('✅ User cascade delete middleware initialized');
    
  } catch (error) {
    console.warn('⚠️ User model not found, skipping user cascade middleware');
  }
};

// Project cascade delete middleware
const setupProjectCascadeMiddleware = () => {
  try {
    const Project = mongoose.model('Project');
    
    Project.schema.pre(['findOneAndDelete', 'deleteOne', 'deleteMany'], async function() {
      try {
        const Estimate = mongoose.model('Estimate');
        
        const projectId = this.getQuery()._id;
        
        if (projectId) {
          console.log(`Cascading delete for project: ${projectId}`);
          
          const estimateResult = await Estimate.deleteMany({ projectId }).catch(err => {
            console.warn('Estimate model not found or error:', err.message);
            return { deletedCount: 0 };
          });
          
          console.log(`Project cascade delete completed:
            - Estimates: ${estimateResult.deletedCount} records`);
        }
        
      } catch (error) {
        console.error('Error in project cascade delete middleware:', error);
      }
    });

    console.log('✅ Project cascade delete middleware initialized');
    
  } catch (error) {
    console.warn('⚠️ Project model not found, skipping project cascade middleware');
  }
};

// Initialize all cascade delete middlewares
const initializeCascadeDelete = () => {
  console.log('🚀 Initializing cascade delete middlewares...');
  
  // Small delay to ensure all models are loaded
  setTimeout(() => {
    setupUserCascadeMiddleware();
    setupProjectCascadeMiddleware();
    console.log('✅ All cascade delete middlewares initialized');
  }, 1000);
};

export { 
  initializeCascadeDelete, 
  setupUserCascadeMiddleware, 
  setupProjectCascadeMiddleware 
};