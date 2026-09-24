const mongoose = require('mongoose');

const PolicyChunkSchema = new mongoose.Schema({
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true }
});

const HospitalPolicySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a policy title'],
    trim: true
  },
  category: {
    type: String,
    default: 'General'
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  extractedText: {
    type: String,
    default: ''
  },
  chunks: [PolicyChunkSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Dual-write sync to PostgreSQL
const dualWrite = require('../services/dualWrite');
HospitalPolicySchema.post('save', function(doc) {
  dualWrite.syncHospitalPolicy(doc);
});

module.exports = mongoose.model('HospitalPolicy', HospitalPolicySchema);
