import Expense from '../models/ExpenseModel.js';
import mongoose from 'mongoose';

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to handle async operations
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// @desc    Get all expenses for authenticated user
// @route   GET /api/expenses/get-all-expenses
// @access  Private
export const getAllExpenses = asyncHandler(async (req, res) => {
  try {
    const userIdp = req.user.id;


    // Execute query with pagination and sorting
    const expenses = await Expense.find({userId:userIdp})
 

    // Get total count for paginati
    // Calculate basic statistics
   

    res.status(200).json({
      success: true,
      expenses,
      message: 'Expenses retrieved successfully'
    });

  } catch (error) {
    console.error('Error in getAllExpenses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving expenses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Create a new expense
// @route   POST /api/expenses/create-expense
// @access  Private
export const addExpense = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      amount,
      currency = 'INR',
      category,
      expenseDate,
      tags = []
    } = req.body;

    // Validate required fields
    if (!title || !amount || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, amount, and category are required fields'
      });
    }

    // Validate amount
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a valid positive number'
      });
    }

    // Create expense data
    const expenseData = {
      title: title.trim(),
      description: description?.trim() || '',
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      category,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      tags: Array.isArray(tags) ? tags.map(tag => tag.trim()).filter(Boolean) : [],
      userId
    };

    // Create new expense
    const expense = new Expense(expenseData);
    const savedExpense = await expense.save();

    res.status(201).json({
      success: true,
      expense: savedExpense,
      id: savedExpense._id,
      message: 'Expense created successfully'
    });

  } catch (error) {
    console.error('Error in addExpense:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating expense',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update an existing expense by ID
// @route   PUT /api/expenses/update-expense/:id
// @access  Private
export const updateExpense = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      title,
      description,
      amount,
      currency,
      category,
      expenseDate,
      tags
    } = req.body;

    // Validate expense ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID format'
      });
    }

    // Find the expense and verify ownership
    const existingExpense = await Expense.findOne({ _id: id, userId });
    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found or you do not have permission to update it'
      });
    }

    // Validate amount if provided
    if (amount !== undefined && (isNaN(amount) || parseFloat(amount) <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a valid positive number'
      });
    }

    // Prepare update data
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (currency !== undefined) updateData.currency = currency.toUpperCase();
    if (category !== undefined) updateData.category = category;
    if (expenseDate !== undefined) updateData.expenseDate = new Date(expenseDate);
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags.map(tag => tag.trim()).filter(Boolean) : [];
    }

    // Update the expense
    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    res.status(200).json({
      success: true,
      expense: updatedExpense,
      message: 'Expense updated successfully'
    });

  } catch (error) {
    console.error('Error in updateExpense:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating expense',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Delete an expense by ID
// @route   DELETE /api/expenses/delete-expense/:id
// @access  Private
export const deleteExpense = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate expense ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID format'
      });
    }

    // Find and delete the expense (only if user owns it)
    const deletedExpense = await Expense.findOneAndDelete({ _id: id, userId });

    if (!deletedExpense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found or you do not have permission to delete it'
      });
    }

    res.status(200).json({
      success: true,
      expense: deletedExpense,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteExpense:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting expense',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});