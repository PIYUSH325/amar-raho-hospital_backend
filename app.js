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
    
    // Check if origin is whitelisted or is a Vercel deployment URL
    const isAllowed = allowedOrigins.indexOf(origin) !== -1 || origin.includes('.vercel.app');
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/chats', require('./routes/chatRoutes'));

// Universal Hospital Public Chatbot API Gateway
app.post('/api/public/hospital-chat', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const FormData = require('form-data');
    const axios = require('axios');
    const form = new FormData();
    form.append('message', message);

    const pythonRes = await axios.post('http://127.0.0.1:8000/public-chat', form, {
      headers: {
        ...form.getHeaders(),
        'x-gemini-api-key': process.env.GEMINI_API_KEY || ''
      }
    });

    if (pythonRes.data && pythonRes.data.status === 'success') {
      return res.json({ success: true, reply: pythonRes.data.reply });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to query AI chatbot.' });
    }
  } catch (error) {
    next(error);
  }
});

// Centralized Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;
