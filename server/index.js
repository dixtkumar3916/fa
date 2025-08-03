const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const cropRoutes = require('./routes/crops');
const expenseRoutes = require('./routes/expenses');
const reportRoutes = require('./routes/reports');
const chatRoutes = require('./routes/chat');
const tipsRoutes = require('./routes/tips');
const advisorRoutes = require('./routes/advisor');
const adminRoutes = require('./routes/admin');
const sensorRoutes = require('./routes/sensors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digifarm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join farmer to their room for personalized updates
  socket.on('join-farmer', (farmerId) => {
    socket.join(`farmer-${farmerId}`);
    console.log(`Farmer ${farmerId} joined their room`);
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    // Broadcast to expert or farmer
    socket.to(`${data.receiverType}-${data.receiverId}`).emit('new-message', data);
  });

  // Handle sensor data updates
  socket.on('sensor-update', (data) => {
    socket.to(`farmer-${data.farmerId}`).emit('sensor-data', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tips', tipsRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sensors', sensorRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Simulate sensor data for demo
setInterval(() => {
  const sensorData = {
    temperature: (Math.random() * 15 + 20).toFixed(1), // 20-35°C
    humidity: (Math.random() * 40 + 40).toFixed(1),    // 40-80%
    soilMoisture: (Math.random() * 50 + 30).toFixed(1), // 30-80%
    pH: (Math.random() * 2 + 6).toFixed(1),           // 6.0-8.0
    timestamp: new Date().toISOString()
  };
  
  // Broadcast to all connected farmers
  io.emit('sensor-data', sensorData);
}, 30000); // Every 30 seconds

module.exports = { app, server, io };