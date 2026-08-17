const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  diagnosis: {
    type: String,
    required: [true, 'Please add a diagnosis']
  },
  treatmentPlan: {
    type: String,
    required: [true, 'Please add a treatment plan']
  },
  notes: {
    type: String,
    default: ''
  },
  attachments: {
    type: [String],
    default: []
  },
  visitDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);
