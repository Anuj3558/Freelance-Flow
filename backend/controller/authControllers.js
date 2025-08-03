import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from "../models/userModel.js";
import { Dashboard } from '../models/DashboardSchema.js';
import mongoose from 'mongoose';
import Revenue from '../models/revenueModel.js';
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// Updated protect middleware to get token from req.body
export const protect = async (req, res, next) => {
  let token;

  // 1. Get token from Authorization header (Bearer Token)
 
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]; // Extract token after "Bearer "
  }

  // 2. If no token, deny access
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized. No token provided.' 
    });
  }

  try {
    // 3. Verify token
    const { valid, decoded, error } = verifyToken(token);
    if (!valid) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized. Invalid token.',
        error 
      });
    }

    // 4. Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found.' 
      });
    }

    // 5. Attach user to request
    req.user = user;
    // 6. Update dashboard stats if needed
    await Dashboard.updateDashboardStats(user.id);
    const revenue1 = await Revenue.calculateCurrentMonthRevenue(user.id);
    
    await Revenue.updateOne(
  { userId: user.id, month: revenue1.month, year: revenue1.year },
  { 
    userId: user.id,
    month: revenue1.month,
    year: revenue1.year,
    revenue: revenue1.revenue 
  },
  { upsert: true }
);
    next();

  } catch (error) {
    console.error('Protect Middleware Error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
};
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const homeController = (req, res) => {
  res.status(200).json({
    message: "Welcome to the Financial Tracker API",
  });
};

export const registerController = async (req, res) => {
  const { name, email, password, role ,avatar} = req.body;

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      avatar:  name.slice(0, 1).toUpperCase() , // Default avatar
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const loginController = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    console.log("User found:", user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user.id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("Error logging in:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const logoutController = async (req, res) => {
  // In a real app, you might blacklist the token here
  res.status(200).json({ message: "Logout successful" });
};