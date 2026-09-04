const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Grouping fields to ensure absolute privacy isolation
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  text: { type: String, default: '' },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'document', 'audio', 'video'], 
    default: 'text' 
  },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileSize: { type: String, default: null },
  duration: { type: Number, default: null }, // Duration in seconds for audio
  createdAt: { type: Date, default: Date.now }
});

// Dual-Write Sync to PostgreSQL
const dualWrite = require('../services/dualWrite');
messageSchema.post('save', function(doc) {
  dualWrite.syncMessage(doc);
});

module.exports = mongoose.model('Message', messageSchema);

