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
  status: {
    type: String,
    enum: ['Scheduled', 'Approved', 'Completed', 'Cancelled'],
    default: 'Scheduled'
  },
  createdAt: { type: Date, default: Date.now }
});

// Dual-Write Sync to PostgreSQL
const dualWrite = require('../services/dualWrite');
AppointmentSchema.post('save', function(doc) {
  dualWrite.syncAppointment(doc);
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
