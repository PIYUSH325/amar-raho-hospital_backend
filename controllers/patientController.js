const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const ocrService = require('../services/ocrService');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// @desc    Get currently logged in patient's profile details
// @route   GET /api/patients/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    let patient = await Patient.findOne({ user: req.user.id }).populate('user', 'name email');
    if (!patient) {
      patient = await Patient.create({ user: req.user.id });
      patient = await Patient.findOne({ user: req.user.id }).populate('user', 'name email');
    }
    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

exports.uploadReport = async (req, res, next) => {
  try {
    const { title, doctorRef } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a report file to upload.' });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please enter a title for the report.' });
    }
    let patient = await Patient.findOne({ user: req.user.id });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    // 1. Initialize filePath first
    const filePath = `/uploads/${req.file.filename}`;

  // 2. Perform OCR scan & AI analysis (Strictly require Python Gemini Service)
    let extractedText = '';
    let aiAnalysis = { condition: '', alerts: '', remedies: '' };

    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(req.file.path));

      const pythonRes = await axios.post('http://127.0.0.1:8000/analyze-file', form, {
        headers: {
          ...form.getHeaders(),
          'x-gemini-api-key': process.env.GEMINI_API_KEY || ''
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      if (pythonRes.data && pythonRes.data.status === 'success') {
        extractedText = pythonRes.data.extracted_text || '';
        aiAnalysis = pythonRes.data.analysis || { condition: '', alerts: '', remedies: '' };
      }
    } catch (err) {
      console.error('Gemini AI Service failed:', err.response?.data?.detail || err.message);
      return res.status(500).json({ 
        success: false, 
        message: err.response?.data?.detail || 'AI Analysis failed. Make sure Python service and Gemini API keys are active.' 
      });
    }
    
    // 3. Push report details to patient array (Only once!)
    patient.reports.push({
      title,
      filePath,
      extractedText,
      aiAnalysis,
      doctorRef: doctorRef || null
    });
    
    await patient.save();

    res.status(201).json({
      success: true,
      message: 'Report uploaded successfully!',
      data: patient.reports
    });
  } catch (error) {
    next(error);
  }
};

exports.chatWithAI = async (req, res, next) => {
  try {
    const { message, reportText } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const form = new FormData();
    form.append('message', message);
    form.append('report_text', reportText || '');

    const pythonRes = await axios.post('http://127.0.0.1:8000/chat', form, {
      headers: {
        ...form.getHeaders(),
        'x-gemini-api-key': process.env.GEMINI_API_KEY || ''
      }
    });

    if (pythonRes.data && pythonRes.data.status === 'success') {
      return res.json({ success: true, reply: pythonRes.data.reply });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to query AI copilot.' });
    }
  } catch (error) {
    console.error('AI Copilot Chat failed:', error.message);
    res.status(500).json({ success: false, message: error.response?.data?.detail || error.message });
  }
};

exports.toggleTodoTask = async (req, res, next) => {
  try {
    const { taskId } = req.body;
    const patient = await Patient.findOne({ user: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const task = patient.dietPlan.id(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    task.isCompleted = !task.isCompleted;
    await patient.save();

    res.json({ success: true, message: 'Checklist task toggled successfully', data: patient.dietPlan });
  } catch (error) {
    next(error);
  }
};

exports.checkMissedTasks = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ user: req.user.id }).populate('user', 'name');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeVal = currentHours * 60 + currentMinutes;

    let updated = false;
    const patientUser = await User.findById(req.user.id);
    const patientName = patientUser ? patientUser.name : 'Patient';

    for (let task of patient.dietPlan) {
      if (!task.isCompleted && !task.missedAlertSent) {
        const parts = task.targetTime.split(':');
        const targetHours = parseInt(parts[0], 10);
        const targetMinutes = parseInt(parts[1], 10);
        const targetTimeVal = targetHours * 60 + targetMinutes;

        // If targetTime has passed
        if (currentTimeVal > targetTimeVal) {
          task.missedAlertSent = true;
          updated = true;

          // Find doctor for this patient
          const appt = await Appointment.findOne({ user: req.user.id }).sort({ createdAt: -1 });
          const doctorId = appt ? appt.doctorRef : null;

          if (doctorId) {
            await Notification.create({
              doctor: doctorId,
              patient: req.user.id,
              message: `⚠️ Patient "${patientName}" did not follow their diet plan: Missed "${task.task}" scheduled by ${task.targetTime}!`
            });
          }
        }
      }
    }

    if (updated) {
      await patient.save();
    }

    res.json({ success: true, data: patient.dietPlan });
  } catch (error) {
    next(error);
  }
};
  