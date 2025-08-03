import { Router } from "express";

const ExpenseRouter = Router();
import {
    addExpense,
    deleteExpense,
    getAllExpenses,
    updateExpense,
}
from "../controller/expenseController.js";

// Get all expenses for a client
ExpenseRouter.get("/expenses/get-all-expenses", getAllExpenses);
// Add a new expense for a client
ExpenseRouter.post("/expenses/create-expense", addExpense);

// Update an existing expense by ID
ExpenseRouter.put("/expenses/update-expense/:id", updateExpense);
// Delete an expense by ID
ExpenseRouter.delete("/expenses/delete-expense/:id", deleteExpense);
export default ExpenseRouter;