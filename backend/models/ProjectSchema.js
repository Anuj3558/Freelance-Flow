import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Milestone name is required'],
    trim: true
  },
  description: {
    type: String,
    maxlength: [7000, 'Description cannot exceed 500 characters']
  },
  percentage: {
    type: Number,
    required: [true, 'Percentage is required'],
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },

 
  isAchived: {
    type: Boolean,
    default: false
  },
  notes: String
}, { 
  _id: true,
  timestamps: true 
});

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: {
    type: String,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  estimateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estimate'
  },
  totalAmount: {
    type: Number,
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
  },
  actualEndDate: Date,
  milestones: [milestoneSchema],
  tags: [{
    type: String,
    trim: true
  }],
  projectNumber: {
    type: String,
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
const Project = mongoose.model('Project', projectSchema);
const Milestone = mongoose.model('Milestone', milestoneSchema);
export default Project;