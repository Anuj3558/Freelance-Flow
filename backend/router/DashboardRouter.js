import { Router } from "express";
import { Dashboard } from "../models/DashboardSchema.js";
import Revenue from "../models/revenueModel.js";
import Expense from "../models/ExpenseModel.js";
import mongoose from "mongoose";

const DashboardRouter = Router();

// Get dashboard data
DashboardRouter.get("/analytics/dashboard-stats", async (req, res) => {
    try {
        const id = req.user.id;
        const data = await Dashboard.find({ userId: id });
        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard data",
            error: error.message,
        });
    }
});

DashboardRouter.get("/analytics/revenue-over-time", async (req, res) => {
    try {
        const id = req.user.id;
        const data = await Revenue.find({ userId: id });
        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch revenue data",
            error: error.message,
        });
    }
});

// Complete the expense breakdown endpoint
DashboardRouter.get("/analytics/expense-breakdown", async (req, res) => {
    try {
        const id = req.user.id;
        
        // Aggregate expenses by category
        const expenseBreakdown = await Expense.aggregate([
            {
                $match: { userId:new  mongoose.Types.ObjectId(id) }
            },
            {
                $group: {
                    _id: "$category",
                    amount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    category: "$_id",
                    amount: 1,
                    count: 1,
                    _id: 0
                }
            },
            {
                $sort: { amount: -1 } // Sort by amount in descending order
            }
        ]);
       console.log(expenseBreakdown)
        res.status(200).json({
            success: true,
            data: expenseBreakdown,
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: "Failed to fetch expense breakdown data",
            error: error.message,
        });
    }
});

export default DashboardRouter;