const mongoose = require('mongoose');

const AiSettingsSchema = new mongoose.Schema({
  hospitalName: {
    type: String,
    default: 'Amar Raho Hospital',
    trim: true
  },
  address: {
    type: String,
    default: 'Plot 404, Yamaraj Bypass Road, Near Swarg Lok U-Turn, Narak-Pur',
    trim: true
  },
  emergencyPhone: {
    type: String,
    default: '+91 98765-AMAR-1',
    trim: true
  },
  supportEmail: {
    type: String,
    default: 'support@amarraho.com',
    trim: true
  },
  operatingHours: {
    type: String,
    default: 'Monday to Friday, 09:00 AM to 12:00 PM',
    trim: true
  },
  botPersonality: {
    type: String,
    default: 'polite, empathetic, concise, and professional',
    trim: true
  },
  welcomeGreeting: {
    type: String,
    default: 'Welcome to Amar Raho Hospital! I am your AI Support & Navigational Guide. How can I help you today? You can ask me about our doctors, specializations, departments, timings, or online appointment booking!',
    trim: true
  },
  outOfScopeRules: {
    type: String,
    default: `You MUST STRICTLY REFUSE to answer questions unrelated to health, medicine, doctors, appointments, hospital policies, or hospital services.
This includes:
- Computer programming, software development, web design, networking, APIs, or databases.
- General trivia, pop culture, movies, music, sports, or gaming.
- Mathematics, homework, finance, cryptocurrency, or politics.
Mandatory Refusal response:
"I am the dedicated AI Assistant for Amar Raho Hospital. I specialize exclusively in healthcare, our clinical departments, doctor appointments, and hospital services. I cannot assist with technical or non-medical topics. Please let me know how I can assist with your health or hospital visits!"`,
    trim: true
  },
  customInstructions: {
    type: String,
    default: '',
    trim: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('AiSettings', AiSettingsSchema);
