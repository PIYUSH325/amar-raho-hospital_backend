const socketIO = require('socket.io');
const Message = require('./models/Message');

const initSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Socket Client connected:', socket.id);

    // 1. Join Unique Doctor-Patient Room
    socket.on('join_room', ({ roomId }) => {
      socket.join(roomId);
      console.log(`🏠 Socket client ${socket.id} joined room: ${roomId}`);
    });

    // 1b. Register User for Global Notifications
    socket.on('register', ({ userId }) => {
      socket.join(`user_${userId}`);
      console.log(`👤 User registered in socket room: user_${userId}`);
    });

    // 2. Real-time Message Send
    socket.on('send_message', async (messageData) => {
      const { roomId, senderId, recipientId, patientId, doctorId, text, senderName } = messageData;
      console.log(`✉️ Received send_message event for Room ID: ${roomId} from sender: ${senderId}`);

      try {
        const savedMsg = await Message.create({
          sender: senderId,
          recipient: recipientId,
          patient: patientId,
          doctor: doctorId,
          text
        });
        console.log("💾 Message saved in MongoDB successfully. Message ID:", savedMsg._id);

        // Broadcast to the room
        io.to(roomId).emit('receive_message', savedMsg);
        console.log(`📢 Broadcasted receive_message to room: ${roomId}`);

        // Broadcast notification to recipient's personal user room
        io.to(`user_${recipientId}`).emit('receive_message_notification', {
          msg: savedMsg,
          senderName: senderName || 'Someone'
        });
        console.log(`🔔 Emitted notification alert to user room: user_${recipientId}`);
      } catch (err) {
        console.error('❌ Error saving socket message:', err);
      }
    });

    // 3. Typing Status Broadcast
    socket.on('typing', ({ roomId, isTyping, senderName }) => {
      socket.to(roomId).emit('typing_status', { isTyping, senderName });
    });

    // 4. WebRTC Signaling Event Routing
    socket.on('call_user', ({ roomId, offer, callerName, type }) => {
      console.log(`📞 Routing call_user event in Room: ${roomId} from: ${callerName}`);
      socket.to(roomId).emit('incoming_call', { offer, callerName, type });
    });

    socket.on('accept_call', ({ roomId, answer }) => {
      console.log(`📞 Routing accept_call event in Room: ${roomId}`);
      socket.to(roomId).emit('call_accepted', { answer });
    });

    socket.on('ice_candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice_candidate', { candidate });
    });

    socket.on('end_call', ({ roomId }) => {
      console.log(`📞 Routing end_call event in Room: ${roomId}`);
      socket.to(roomId).emit('call_ended');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket Client disconnected:', socket.id);
    });
  });

  return io;
};

module.exports = initSocket;