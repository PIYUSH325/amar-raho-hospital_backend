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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Doctor', DoctorSchema);
