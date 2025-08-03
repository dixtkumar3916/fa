const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farmers', require('./routes/farmers'));
app.use('/api/crops', require('./routes/crops'));
app.use('/api/market', require('./routes/market'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/advice', require('./routes/advice'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/tips', require('./routes/tips'));

// Socket.IO for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join farmer-specific room
  socket.on('join-farmer', (farmerId) => {
    socket.join(`farmer-${farmerId}`);
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    io.to(`farmer-${data.farmerId}`).emit('new-message', data);
  });

  // Handle sensor data updates
  socket.on('sensor-update', (data) => {
    io.emit('sensor-data', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digifarm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Simulate sensor data
setInterval(() => {
  const sensorData = {
    temperature: (Math.random() * 15 + 20).toFixed(1), // 20-35°C
    humidity: (Math.random() * 30 + 40).toFixed(1), // 40-70%
    soilMoisture: (Math.random() * 40 + 30).toFixed(1), // 30-70%
    ph: (Math.random() * 2 + 6).toFixed(1), // 6-8 pH
    timestamp: new Date()
  };
  io.emit('sensor-data', sensorData);
}, 5000); // Update every 5 seconds

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});