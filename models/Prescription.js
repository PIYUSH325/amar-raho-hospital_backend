const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: String, required: true }
});

const PrescriptionSchema = new mongoose.Schema({
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
  medicines: [MedicineSchema],
  instructions: {
    type: String,
    default: ''
  }
}, { 
  timestamps: true ,
  versionKey: false 
});

// Dual-Write Sync to PostgreSQL
const dualWrite = require('../services/dualWrite');
PrescriptionSchema.post('save', function(doc) {
  dualWrite.syncPrescription(doc);
});

module.exports = mongoose.model('Prescription', PrescriptionSchema);