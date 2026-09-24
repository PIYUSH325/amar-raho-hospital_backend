const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middlewares
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.1.4:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Check if origin is whitelisted, local subnet, or is a Vercel deployment URL
    const isAllowed = 
      allowedOrigins.indexOf(origin) !== -1 || 
      origin.includes('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://172.') ||
      origin.startsWith('http://10.');
      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes Mount
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/medical-records', require('./routes/medicalRecordRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/diet', require('./routes/dietRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/chats', require('./routes/chatRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Universal Hospital Public Chatbot Endpoint (Direct Node.js AI Engine)
const { agentChat } = require('./ai');
const jwt = require('jsonwebtoken');

app.post('/api/public/hospital-chat', async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    // Optional user context from Bearer token
    let userContext = req.user || null;
    if (!userContext && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          const User = require('./models/User');
          const foundUser = await User.findById(decoded.id).select('-password');
          if (foundUser) {
            userContext = {
              id: foundUser._id.toString(),
              _id: foundUser._id,
              name: foundUser.name,
              email: foundUser.email,
              role: foundUser.role
            };
          }
        }
      } catch (tokErr) {
        // Continue as guest if token is expired or invalid
      }
    }

    const result = await agentChat(message, history, userContext);

    return res.json({
      success: true,
      reply: result.reply,
      toolUsed: result.toolUsed,
      toolData: result.toolData,
    });
  } catch (error) {
    next(error);
  }
});

// Centralized Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;
