const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Set up module resolution for backend files
const backendPath = path.join(__dirname, '..', 'backend');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// MongoDB connection - Vercel recommended pattern with global caching
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI environment variable');
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Import routes
const authRoutes = require(path.join(backendPath, 'routes', 'auth'));
const classRoutes = require(path.join(backendPath, 'routes', 'class'));
const attendanceRoutes = require(path.join(backendPath, 'routes', 'attendance'));

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    res.json({ status: 'ok', message: 'Server is running', db: mongoose.connection.readyState });
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
