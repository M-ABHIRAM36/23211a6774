const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const schedulerRoutes = require('./routes/schedulerRoutes');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Base informational route
app.get('/', (req, res) => {
  res.status(200).json({
    message: "Vehicle Scheduler API Service is running.",
    endpoints: {
      schedule: "GET /api/schedule"
    }
  });
});

// Routes
app.use('/api', schedulerRoutes);

// 404 handler for unmatched routes
app.use((req, res, next) => {
  res.status(404).json({
    error: "Not Found",
    message: `Resource not found: ${req.method} ${req.url}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler caught:", err);
  
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Internal Server Error" : "Error",
    message: err.message || "An unexpected error occurred"
  });
});

module.exports = app;
