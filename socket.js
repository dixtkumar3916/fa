const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Chat = require('./models/Chat');
const EquipmentBooking = require('./models/EquipmentBooking');

module.exports = (io) => {
  // Store connected users
  const connectedUsers = new Map();
  
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.role})`);
    
    // Store user connection
    connectedUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date()
    });
    
    // Join user to their role-based room
    socket.join(socket.user.role);
    
    // Join user to their personal room
    socket.join(`user_${socket.user._id}`);
    
    // If user is an expert, join expert room
    if (socket.user.role === 'expert') {
      socket.join('experts');
    }
    
    // If user is an admin, join admin room
    if (socket.user.role === 'admin') {
      socket.join('admins');
    }
    
    // Update user's online status
    if (socket.user.role === 'expert') {
      User.findByIdAndUpdate(socket.user._id, {
        'expert.availability': 'available',
        lastLogin: new Date()
      }).exec();
    }
    
    // Handle chat messages
    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, messageType = 'text', attachments = [] } = data;
        
        const chat = await Chat.findOne({ chatId }).populate('participants.user', 'name role');
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }
        
        // Check if user is participant
        const isParticipant = chat.participants.some(p => 
          p.user._id.toString() === socket.user._id.toString()
        );
        
        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to send message' });
          return;
        }
        
        // Add message to chat
        await chat.addMessage(socket.user._id, content, messageType, attachments);
        
        // Emit message to all participants
        chat.participants.forEach(participant => {
          const participantSocketId = connectedUsers.get(participant.user._id.toString())?.socketId;
          if (participantSocketId) {
            io.to(participantSocketId).emit('new_message', {
              chatId,
              message: {
                sender: socket.user._id,
                content,
                messageType,
                attachments,
                timestamp: new Date()
              }
            });
          }
        });
        
        // Send notification to offline participants
        chat.participants.forEach(participant => {
          if (participant.user._id.toString() !== socket.user._id.toString()) {
            const isOnline = connectedUsers.has(participant.user._id.toString());
            if (!isOnline) {
              // Send push notification
              socket.emit('send_notification', {
                userId: participant.user._id,
                type: 'message',
                title: `New message from ${socket.user.name}`,
                body: content.substring(0, 100),
                data: { chatId }
              });
            }
          }
        });
        
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle typing indicators
    socket.on('typing_start', async (data) => {
      const { chatId } = data;
      const chat = await Chat.findOne({ chatId });
      
      if (chat) {
        chat.participants.forEach(participant => {
          if (participant.user.toString() !== socket.user._id.toString()) {
            const participantSocketId = connectedUsers.get(participant.user.toString())?.socketId;
            if (participantSocketId) {
              io.to(participantSocketId).emit('user_typing', {
                chatId,
                userId: socket.user._id,
                userName: socket.user.name
              });
            }
          }
        });
      }
    });
    
    socket.on('typing_stop', async (data) => {
      const { chatId } = data;
      const chat = await Chat.findOne({ chatId });
      
      if (chat) {
        chat.participants.forEach(participant => {
          if (participant.user.toString() !== socket.user._id.toString()) {
            const participantSocketId = connectedUsers.get(participant.user.toString())?.socketId;
            if (participantSocketId) {
              io.to(participantSocketId).emit('user_stopped_typing', {
                chatId,
                userId: socket.user._id
              });
            }
          }
        });
      }
    });
    
    // Handle message read receipts
    socket.on('mark_read', async (data) => {
      try {
        const { chatId } = data;
        const chat = await Chat.findOne({ chatId });
        
        if (chat) {
          await chat.markAsRead(socket.user._id);
          
          // Notify other participants
          chat.participants.forEach(participant => {
            if (participant.user.toString() !== socket.user._id.toString()) {
              const participantSocketId = connectedUsers.get(participant.user.toString())?.socketId;
              if (participantSocketId) {
                io.to(participantSocketId).emit('messages_read', {
                  chatId,
                  userId: socket.user._id
                });
              }
            }
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });
    
    // Handle equipment booking updates
    socket.on('booking_update', async (data) => {
      try {
        const { bookingId, status, message } = data;
        const booking = await EquipmentBooking.findOne({ bookingId })
          .populate('farmer', 'name')
          .populate('owner', 'name');
        
        if (booking) {
          // Notify farmer
          const farmerSocketId = connectedUsers.get(booking.farmer._id.toString())?.socketId;
          if (farmerSocketId) {
            io.to(farmerSocketId).emit('booking_status_update', {
              bookingId,
              status,
              message
            });
          }
          
          // Notify equipment owner
          const ownerSocketId = connectedUsers.get(booking.owner._id.toString())?.socketId;
          if (ownerSocketId) {
            io.to(ownerSocketId).emit('booking_status_update', {
              bookingId,
              status,
              message
            });
          }
        }
      } catch (error) {
        console.error('Error updating booking:', error);
      }
    });
    
    // Handle expert availability updates
    socket.on('update_availability', async (data) => {
      try {
        const { availability } = data;
        await User.findByIdAndUpdate(socket.user._id, {
          'expert.availability': availability
        });
        
        // Notify admins about expert availability change
        io.to('admins').emit('expert_availability_changed', {
          expertId: socket.user._id,
          expertName: socket.user.name,
          availability
        });
        
        // Notify assigned farmers
        if (socket.user.expert && socket.user.expert.assignedFarmers) {
          socket.user.expert.assignedFarmers.forEach(farmerId => {
            const farmerSocketId = connectedUsers.get(farmerId.toString())?.socketId;
            if (farmerSocketId) {
              io.to(farmerSocketId).emit('expert_availability_update', {
                expertId: socket.user._id,
                expertName: socket.user.name,
                availability
              });
            }
          });
        }
      } catch (error) {
        console.error('Error updating availability:', error);
      }
    });
    
    // Handle admin notifications
    socket.on('admin_notification', (data) => {
      const { type, message, targetRole } = data;
      
      switch (targetRole) {
        case 'all':
          io.emit('admin_notification', { type, message });
          break;
        case 'farmers':
          io.to('farmer').emit('admin_notification', { type, message });
          break;
        case 'experts':
          io.to('experts').emit('admin_notification', { type, message });
          break;
        case 'admins':
          io.to('admins').emit('admin_notification', { type, message });
          break;
      }
    });
    
    // Handle AI chatbot interactions
    socket.on('ai_chat', async (data) => {
      try {
        const { message, context } = data;
        
        // Process AI response (this would integrate with OpenAI or similar)
        const aiResponse = await processAIResponse(message, context, socket.user);
        
        socket.emit('ai_response', {
          message: aiResponse,
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error('Error processing AI chat:', error);
        socket.emit('ai_error', { message: 'Failed to process AI response' });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.name}`);
      
      // Remove from connected users
      connectedUsers.delete(socket.user._id.toString());
      
      // Update expert availability if they were online
      if (socket.user.role === 'expert') {
        await User.findByIdAndUpdate(socket.user._id, {
          'expert.availability': 'offline'
        });
        
        // Notify admins
        io.to('admins').emit('expert_availability_changed', {
          expertId: socket.user._id,
          expertName: socket.user.name,
          availability: 'offline'
        });
      }
    });
  });
  
  // Helper function to process AI responses
  async function processAIResponse(message, context, user) {
    // This is a simplified AI response system
    // In production, this would integrate with OpenAI, Google AI, or similar
    
    const responses = {
      greeting: [
        "Hello! I'm your AI farming assistant. How can I help you today?",
        "Namaste! I'm here to help with your farming questions.",
        "Welcome! I can assist you with crop recommendations, soil analysis, and more."
      ],
      soil_help: [
        "I can help you analyze your soil report and provide recommendations.",
        "For soil analysis, please upload your soil test report or describe your soil type.",
        "Based on your location and soil type, I can suggest suitable crops and fertilizers."
      ],
      equipment_help: [
        "I can help you find and book agricultural equipment in your area.",
        "What type of equipment are you looking for? I can show you available options.",
        "For equipment booking, please specify your requirements and preferred dates."
      ],
      crop_help: [
        "I can recommend crops based on your soil type, season, and location.",
        "What's your soil type and current season? I'll suggest the best crops.",
        "I can provide crop recommendations with expected yields and care instructions."
      ],
      default: [
        "I'm here to help with your farming needs. Please ask me about soil analysis, crop recommendations, or equipment booking.",
        "I can assist you with various farming topics. What would you like to know?",
        "Feel free to ask me about crops, soil, equipment, or any farming-related questions."
      ]
    };
    
    const messageLower = message.toLowerCase();
    let category = 'default';
    
    if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('namaste')) {
      category = 'greeting';
    } else if (messageLower.includes('soil') || messageLower.includes('fertilizer')) {
      category = 'soil_help';
    } else if (messageLower.includes('equipment') || messageLower.includes('tractor') || messageLower.includes('harvester')) {
      category = 'equipment_help';
    } else if (messageLower.includes('crop') || messageLower.includes('plant') || messageLower.includes('seed')) {
      category = 'crop_help';
    }
    
    const categoryResponses = responses[category];
    const randomResponse = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
    
    return randomResponse;
  }
  
  // Export connected users for use in other parts of the application
  return {
    connectedUsers,
    sendNotification: (userId, notification) => {
      const userSocketId = connectedUsers.get(userId.toString())?.socketId;
      if (userSocketId) {
        io.to(userSocketId).emit('notification', notification);
      }
    },
    broadcastToRole: (role, event, data) => {
      io.to(role).emit(event, data);
    }
  };
};