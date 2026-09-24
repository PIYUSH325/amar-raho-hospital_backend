const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Links to the Doctor's User document ID
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  doctor: { type: String, required: true }, // Doctor name string
  date: { type: String, required: true },
  time: { type: String, required: true },
  problem: { type: String, required: true },
  notes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Scheduled', 'Approved', 'Completed', 'Cancelled'],
    default: 'Scheduled'
  },
  appointmentId: {
    type: String,
    unique: true,
    sparse: true
  },
  confirmationEmailStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'not_applicable'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-generate human-readable appointment ID (e.g. ARH-10245) if not set
AppointmentSchema.pre('save', function(next) {
  if (!this.appointmentId) {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    this.appointmentId = `ARH-${randomSuffix}`;
  }
  this.updatedAt = new Date();
  next();
});

// Dual-Write Sync to PostgreSQL
const dualWrite = require('../services/dualWrite');
AppointmentSchema.post('save', function(doc) {
  dualWrite.syncAppointment(doc);
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
