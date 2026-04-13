const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/ride');
const { initDB } = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-rider', () => {
    socket.join('riders');
    console.log('Rider joined:', socket.id);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('io', io);

initDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/ride', rideRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'running',
    database: 'SQLite',
    location: path.join(__dirname, 'database.db')
  });
});

server.listen(PORT, () => {
  console.log('\n✅ Backend server started successfully!');
  console.log('  Socket.io enabled');
  console.log('');
  console.log('\nAvailable endpoints:');
  console.log('  POST  /api/auth/signup');
  console.log('  POST  /api/auth/login');
  console.log('  POST  /api/auth/forgot-password');
  console.log('');
});

