import mongoose from 'mongoose';

// Expense Schema
const expenseSchema = new mongoose.Schema({
  // Basic expense information
  title: {
    type: String,
    required: [true, 'Expense title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0, 'Amount must be positive'],
    set: (value) => Math.round(value * 100) / 100 // Round to 2 decimal places
  },
  
  currency: {
    type: String,
    required: true,
    default: 'INR',
    uppercase: true,
    enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY']
  },
  
  // Expense categorization
  category: {
    type: String,
    required: [true, 'Expense category is required'],
    
  },

  
  // Date information
  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required'],
    default: Date.now
  },
  
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  // User who created the expense
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
// Create the Expense model
const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;