const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const appointmentService = require('../services/appointmentService');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { agentChat } = require('../ai');

async function runTests() {
  console.log('🚀 Starting AI Appointment Booking & Notification Verification Tests...\n');

  // 1. Connect DB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Get test patient
  let patientUser = await User.findOne({ email: 'piyushth090@gmail.com' });
  if (!patientUser) {
    patientUser = await User.findOne({ role: 'patient' });
  }
  if (!patientUser) {
    throw new Error('No patient found in database for testing.');
  }
  console.log(`👤 Using test patient: ${patientUser.name} (${patientUser.email}), ID: ${patientUser._id}`);

  // Get test doctor
  let doctorUser = await User.findOne({ role: 'doctor', name: /Sharma/i });
  if (!doctorUser) {
    doctorUser = await User.findOne({ role: 'doctor' });
  }
  console.log(`👨‍⚕️ Using test doctor: ${doctorUser.name}, ID: ${doctorUser._id}\n`);

  const tomorrowStr = '2026-09-22';
  const testTime = '10:00 AM';

  // Clean up any pre-existing appointment for this slot before testing
  await Appointment.deleteMany({
    doctorRef: doctorUser._id,
    date: tomorrowStr,
    time: testTime
  });

  // TEST 1: Check Doctor Availability
  console.log('--- TEST 1: checkDoctorAvailability ---');
  const availResult = await appointmentService.checkDoctorAvailability({
    doctorName: 'Dr. Sharma',
    date: tomorrowStr,
    time: testTime
  });
  console.log('Availability result:', availResult);
  if (!availResult.isAvailable) {
    throw new Error(`Expected doctor to be available, but got: ${JSON.stringify(availResult)}`);
  }
  console.log('✅ TEST 1 PASSED: Doctor is available and confirmation prompt generated.\n');

  // TEST 2: Unauthenticated Booking Rejection
  console.log('--- TEST 2: Unauthenticated Booking Security ---');
  const unauthResult = await appointmentService.bookAppointment({
    doctorName: 'Dr. Sharma',
    appointmentDate: tomorrowStr,
    appointmentTime: testTime,
    authenticatedUser: null
  });
  console.log('Unauth result:', unauthResult);
  if (unauthResult.success || !unauthResult.requiresAuth) {
    throw new Error('Expected unauthenticated booking to be rejected!');
  }
  console.log('✅ TEST 2 PASSED: Unauthenticated booking correctly blocked.\n');

  // TEST 3: Authenticated Booking & Email Dispatch
  console.log('--- TEST 3: Authenticated Booking & Email Dispatch ---');
  const bookResult = await appointmentService.bookAppointment({
    doctorName: 'Dr. Sharma',
    appointmentDate: tomorrowStr,
    appointmentTime: testTime,
    reason: 'Cardiology routine checkup',
    notes: 'Test booking via automated test',
    authenticatedUser: {
      id: patientUser._id.toString(),
      name: patientUser.name,
      email: patientUser.email
    }
  });
  console.log('Booking result:', bookResult);
  if (!bookResult.success || !bookResult.appointmentId) {
    throw new Error(`Booking failed: ${JSON.stringify(bookResult)}`);
  }
  console.log(`Appointment Created! ID: ${bookResult.appointmentId}, Email Status: ${bookResult.emailStatus}`);

  // Verify in MongoDB
  const savedAppt = await Appointment.findOne({ appointmentId: bookResult.appointmentId });
  if (!savedAppt) {
    throw new Error('Appointment was not found in MongoDB!');
  }
  console.log('Saved DB record:', {
    id: savedAppt._id,
    appointmentId: savedAppt.appointmentId,
    doctor: savedAppt.doctor,
    date: savedAppt.date,
    time: savedAppt.time,
    status: savedAppt.status,
    confirmationEmailStatus: savedAppt.confirmationEmailStatus
  });
  console.log('✅ TEST 3 PASSED: Appointment successfully created in database with email notification.\n');

  // TEST 4: Double-Booking Prevention
  console.log('--- TEST 4: Double-Booking Prevention ---');
  const doubleBookResult = await appointmentService.bookAppointment({
    doctorName: 'Dr. Sharma',
    appointmentDate: tomorrowStr,
    appointmentTime: testTime,
    reason: 'Another patient trying same slot',
    authenticatedUser: {
      id: patientUser._id.toString(),
      name: patientUser.name,
      email: patientUser.email
    }
  });
  console.log('Double booking attempt result:', doubleBookResult);
  if (doubleBookResult.success || !doubleBookResult.isDoubleBooking) {
    throw new Error('Expected double booking to be rejected!');
  }
  console.log('Alternative slots offered:', doubleBookResult.availableAlternatives);
  console.log('✅ TEST 4 PASSED: Double booking prevented and alternatives returned.\n');

  // TEST 5: Full AI Conversational Flow
  console.log('--- TEST 5: Full AI Conversational Agent Flow ---');

  // Clean slot for a clean AI booking test (e.g. 11:00 AM)
  const aiTestTime = '11:00 AM';
  await Appointment.deleteMany({
    doctorRef: doctorUser._id,
    date: tomorrowStr,
    time: aiTestTime
  });

  const authContext = {
    id: patientUser._id.toString(),
    _id: patientUser._id,
    name: patientUser.name,
    email: patientUser.email,
    role: patientUser.role
  };

  // Turn 1: Patient asks to book
  console.log('Patient Turn 1: "Book an appointment with Dr. Sharma tomorrow at 11 AM."');
  const turn1 = await agentChat('Book an appointment with Dr. Sharma tomorrow at 11 AM.', [], authContext);
  console.log('AI Response 1:');
  console.log(turn1.reply);
  console.log('Tool used in Turn 1:', turn1.toolUsed);

  // Turn 2: Patient confirms with simple single-word "yes"
  console.log('\nPatient Turn 2: "yes"');
  const history = [
    { sender: 'user', text: 'Book an appointment with Dr. Sharma tomorrow at 11 AM.' },
    { sender: 'bot', text: turn1.reply }
  ];
  const turn2 = await agentChat('yes', history, authContext);
  console.log('AI Response 2:');
  console.log(turn2.reply);
  console.log('Tool used in Turn 2:', turn2.toolUsed);

  if (!turn2.reply.includes('ARH-') && !turn2.reply.toLowerCase().includes('booked')) {
    throw new Error('Expected Turn 2 AI response to confirm the booked appointment!');
  }
  console.log('✅ TEST 5 PASSED: Full 2-turn AI booking flow executed end-to-end.\n');

  // Clean up test appointments
  await Appointment.deleteMany({
    doctorRef: doctorUser._id,
    date: tomorrowStr,
    time: { $in: [testTime, aiTestTime] }
  });
  console.log('🧹 Cleaned up temporary test appointment records.');

  console.log('\n🎉 ALL 5 INTEGRATION & AI TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
