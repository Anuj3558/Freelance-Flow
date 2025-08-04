import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import { connectToDb } from './connection.js';
import Loginrouter from './router/LoginRouter.js';
import { protect } from './controller/authControllers.js';
import { ClientRouter } from './router/ClientRouter.js';
import { ProjectRouter } from './router/ProjectRouter.js';
import EstimateRouter from './router/EstimateRouter.js';
import { MilestoneRouter } from './router/MilteStoneRouter.js';
import ExpenseRouter from './router/ExpenseRouter.js';
import DashboardRouter from './router/DashboardRouter.js';

// Import middleware instead of Change Stream trigger
import { initializeCascadeDelete } from './Triggers.js';

config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3002;

 const uri = process.env.MONGODB_URI;
 console.log("MongoDB URI:", uri);
// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins — not recommended for production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text({ type: 'text/plain' }));

// Connect to database first
await connectToDb(uri);

// Initialize cascade delete middleware AFTER database connection and models are loaded
initializeCascadeDelete();

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to the Financial Tracker API");
});

// API routes
app.use('/api/auth', Loginrouter);
app.use('/api/clients', protect, ClientRouter);
app.use('/api', protect, ProjectRouter);
app.use("/api", protect, EstimateRouter);
app.use("/api", protect, MilestoneRouter);
app.use("/api", protect, ExpenseRouter); // Added protect middleware
app.use("/api", protect, DashboardRouter); // Added protect middleware

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;