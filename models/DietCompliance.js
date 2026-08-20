const mongoose = require('mongoose');

const DietComplianceSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Format "YYYY-MM-DD"
  meals: {
    breakfast: { type: String, enum: ['Followed', 'Skipped', 'Pending'], default: 'Pending' },
    lunch: { type: String, enum: ['Followed', 'Skipped', 'Pending'], default: 'Pending' },
    snacks: { type: String, enum: ['Followed', 'Skipped', 'Pending'], default: 'Pending' },
    dinner: { type: String, enum: ['Followed', 'Skipped', 'Pending'], default: 'Pending' }
  }
});

// Ensure a patient can only have one compliance entry per calendar day
DietComplianceSchema.index({ patient: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DietCompliance', DietComplianceSchema);
