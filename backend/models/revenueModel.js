import mongoose from 'mongoose';

// Revenue Schema
const revenueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100
  },
  month: {
    type: String,
    required: true,
    enum: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    validate: {
      validator: function(v) {
        const validMonths = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return validMonths.includes(v);
      },
      message: 'Month must be a valid month name (January, February, etc.)'
    }
  },
  revenue: {
    type: Number,
    default: 0,
    min: 0
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
revenueSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

// Helper function to get month name from number
const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber];
};

// Helper function to get month number from name
const getMonthNumber = (monthName) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months.indexOf(monthName);
};

// Static method to calculate current month revenue
revenueSchema.statics.calculateCurrentMonthRevenue = async function(userId) {
  const Project = mongoose.model('Project');
  
  // Get current month and year
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = getMonthName(currentDate.getMonth());
  
  try {
    // Find all projects for the user
    const projects = await Project.find({ 
      $or: [
        { userId: userId },
        { clientId: userId }
      ]
    }).populate('milestones');
    
    let totalRevenue = 0;
    
    // Iterate through projects
    for (const project of projects) {
      if (project.milestones && project.milestones.length > 0) {
        // Iterate through milestones
        for (const milestone of project.milestones) {
          // Check if milestone is achieved and has achievedDate
          if (milestone.isAchived && milestone.updatedAt) {
            const achievedDate = new Date(milestone.updatedAt);
            const achievedYear = achievedDate.getFullYear();
            const achievedMonth = getMonthName(achievedDate.getMonth());
            // If achieved in current month and year, add to revenue
            if (achievedMonth === currentMonth && achievedYear === currentYear) {
              totalRevenue += milestone.amount ;
            }
          }
        }
      }
    }
    
    
    return {
      userId,
      year: currentYear,
      month: currentMonth,
      revenue: totalRevenue,
      calculatedAt: new Date()
    };
    
  } catch (error) {
    throw new Error(`Error calculating revenue: ${error.message}`);
  }
};

// Static method to calculate revenue for specific month and year
revenueSchema.statics.calculateMonthRevenue = async function(userId, year, month) {
  const Project = mongoose.model('Project');
  
  // Validate month name
  const validMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  if (!validMonths.includes(month)) {
    throw new Error('Invalid month name. Use full month names like January, February, etc.');
  }
  
  const monthNumber = getMonthNumber(month);
  
  try {
    // Find all projects for the user
    const projects = await Project.find({ 
      $or: [
        { userId: userId },
        { clientId: userId }
      ]
    }).populate('milestones');
    
    let totalRevenue = 0;
    
    // Iterate through projects
    for (const project of projects) {
      if (project.milestones && project.milestones.length > 0) {
        // Iterate through milestones
        for (const milestone of project.milestones) {
          // Check if milestone is achieved and has achievedDate
          if (milestone.isAchieved && milestone.updatedAt) {
            const achievedDate = new Date(milestone.updatedAt);
            const achievedYear = achievedDate.getFullYear();
            const achievedMonth = achievedDate.getMonth();
            // If achieved in currMonth 
            if (achievedMonth === monthNumber && achievedYear === year) {
              totalRevenue += milestone.amount || 0;
            }
          }
        }
      }
    }
    
    return {
      userId,
      year,
      month,
      revenue: totalRevenue,
      calculatedAt: new Date()
    };
    
  } catch (error) {
    throw new Error(`Error calculating revenue: ${error.message}`);
  }
};

// Static method to update or create revenue record
revenueSchema.statics.updateOrCreateRevenue = async function(userId, year, month, revenue) {
  try {
    const result = await this.findOneAndUpdate(
      { userId, year, month },
      { 
        revenue, 
        calculatedAt: new Date() 
      },
      { 
        upsert: true, 
        new: true, 
        runValidators: true 
      }
    );
    return result;
  } catch (error) {
    throw new Error(`Error updating revenue: ${error.message}`);
  }
};

// Static method to get revenue for multiple months
revenueSchema.statics.getRevenueForPeriod = async function(userId, startYear, startMonth, endYear, endMonth) {
  const startMonthNumber = getMonthNumber(startMonth);
  const endMonthNumber = getMonthNumber(endMonth);
  
  try {
    let query = { userId };
    
    if (startYear === endYear) {
      // Same year
      query.year = startYear;
      const monthsInRange = [];
      for (let i = startMonthNumber; i <= endMonthNumber; i++) {
        monthsInRange.push(getMonthName(i));
      }
      query.month = { $in: monthsInRange };
    } else {
      // Different years - need more complex query
      query.$or = [];
      
      // Start year: from startMonth to December
      const startYearMonths = [];
      for (let i = startMonthNumber; i <= 11; i++) {
        startYearMonths.push(getMonthName(i));
      }
      query.$or.push({ year: startYear, month: { $in: startYearMonths } });
      
      // End year: from January to endMonth
      const endYearMonths = [];
      for (let i = 0; i <= endMonthNumber; i++) {
        endYearMonths.push(getMonthName(i));
      }
      query.$or.push({ year: endYear, month: { $in: endYearMonths } });
      
      // Years in between (if any)
      for (let year = startYear + 1; year < endYear; year++) {
        query.$or.push({ year });
      }
    }
    
    const revenues = await this.find(query).sort({ year: 1, month: 1 });
    return revenues;
  } catch (error) {
    throw new Error(`Error fetching revenue period: ${error.message}`);
  }
};

// Virtual for formatted month display (already in month name format)
revenueSchema.virtual('monthDisplay').get(function() {
  return `${this.month} ${this.year}`;
});

// Virtual for formatted revenue
revenueSchema.virtual('formattedRevenue').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(this.revenue);
});

// Pre-save middleware to ensure valid month and year
revenueSchema.pre('save', function(next) {
  const validMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  if (this.month && !validMonths.includes(this.month)) {
    next(new Error('Month must be a valid month name (January, February, etc.)'));
  } else if (this.year && (this.year < 2000 || this.year > 2100)) {
    next(new Error('Year must be between 2000 and 2100'));
  } else {
    next();
  }
});

// Create the model
const Revenue = mongoose.model('Revenue', revenueSchema);

export default Revenue;