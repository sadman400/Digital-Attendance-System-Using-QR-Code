const path = require('path');

// Set up module resolution for backend files
const backendPath = path.join(__dirname, '..', 'backend');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// MongoDB connection with caching for serverless
let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using cached MongoDB connection');
    return cachedConnection;
  }
  
  try {
    // Clear any existing models to prevent OverwriteModelError
    if (mongoose.connection.readyState === 0) {
      mongoose.set('strictQuery', false);
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: true,
    });
    
    cachedConnection = conn;
    console.log('New MongoDB connection established');
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    cachedConnection = null;
    throw err;
  }
};

// Middleware to connect to DB before each request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB Connection Error:', err);
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

// Import routes AFTER middleware (so connection is established first)
const authRoutes = require(path.join(backendPath, 'routes', 'auth'));
const classRoutes = require(path.join(backendPath, 'routes', 'class'));
const attendanceRoutes = require(path.join(backendPath, 'routes', 'attendance'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    res.json({ status: 'ok', message: 'Server is running', db: 'connected' });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

// Catch-all for unmatched API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
