const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a hospital name'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Please add address']
  },
  phone: {
    type: String,
    required: [true, 'Please add a contact phone']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Hospital', HospitalSchema);
