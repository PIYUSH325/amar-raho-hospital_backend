const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specialization: {
    type: String,
    default: 'General Physician'
  },
  experience: {
    type: Number,
    default: 1
  },
  fees: {
    type: Number,
    default: 500
  },
  bio: {
    type: String,
    default: ''
  },
  availability: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  department: {
    type: String,
    default: 'General'
  },
  isPresenceActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Dual-Write Sync to PostgreSQL
const dualWrite = require('../services/dualWrite');
DoctorSchema.post('save', function(doc) {
  dualWrite.syncDoctor(doc);
});

module.exports = mongoose.model('Doctor', DoctorSchema);
