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

    // 2. Real-time Message Send
    socket.on('send_message', async (messageData) => {
      const { roomId, senderId, recipientId, patientId, doctorId, text } = messageData;
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
      } catch (err) {
        console.error('❌ Error saving socket message:', err);
      }
    });

    // 3. Typing Status Broadcast
    socket.on('typing', ({ roomId, isTyping, senderName }) => {
      socket.to(roomId).emit('typing_status', { isTyping, senderName });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket Client disconnected:', socket.id);
    });
  });

  return io;
};

module.exports = initSocket;