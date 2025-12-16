const app = require('../backend/server');
const { connectDB } = require('../backend/server');

// Connect to MongoDB before handling requests
connectDB();

module.exports = app;
