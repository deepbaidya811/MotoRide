const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const { initDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database
initDB();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'running',
    database: 'SQLite',
    location: path.join(__dirname, 'database.db')
  });
});

app.listen(PORT, () => {
  console.log('\n✅ Backend server started successfully!');
  console.log();
  console.log();
  console.log();
  console.log('\nAvailable endpoints:');
  console.log('  POST  /api/auth/signup');
  console.log('  POST  /api/auth/login');
  console.log('  POST  /api/auth/forgot-password');
  console.log('');
});

