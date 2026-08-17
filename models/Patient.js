const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mobile: {
    type: String,
    default: ''
  },
  age: {
    type: Number,
    default: null
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', ''],
    default: ''
  },
  bloodGroup: {
    type: String,
    default: ''
  },
  emergencyContact: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  reports: [{
    title: { type: String, required: true },
    filePath: { type: String, required: true },
    extractedText: { type: String, default: '' },
    aiAnalysis: {
      condition: { type: String, default: '' },
      alerts: { type: String, default: '' },
      remedies: { type: String, default: '' }
    },
    doctorRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],

  dietPlan: [{
    task: { type: String, required: true },
    type: { type: String, enum: ['nutrition', 'fitness', 'general'], default: 'nutrition' },
    targetTime: { type: String, required: true }, // "HH:MM" e.g., "12:00"
    isCompleted: { type: Boolean, default: false },
    missedAlertSent: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorName: { type: String, default: '' }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Patient', PatientSchema);
