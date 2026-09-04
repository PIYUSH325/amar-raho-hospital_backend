const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const prisma = require('../config/prisma');
const dualWrite = require('../services/dualWrite');

// Models
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const Prescription = require('../models/Prescription');
const MedicalRecord = require('../models/MedicalRecord');

async function runSync() {
  console.log('🔄 Connecting to MongoDB and PostgreSQL...');
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/klinik';
  await mongoose.connect(mongoUri);
  console.log('🍃 MongoDB Connected');

  await prisma.$connect();
  console.log('🐘 PostgreSQL Connected');

  console.log('\n--- 1. Syncing Users ---');
  const users = await User.find({});
  console.log(`Found ${users.length} users in MongoDB.`);
  for (const user of users) {
    await dualWrite.syncUser(user);
  }
  console.log(`✅ Synced ${users.length} users to PostgreSQL.`);

  console.log('\n--- 2. Syncing Doctors ---');
  const doctors = await Doctor.find({});
  console.log(`Found ${doctors.length} doctors in MongoDB.`);
  for (const doc of doctors) {
    await dualWrite.syncDoctor(doc);
  }
  console.log(`✅ Synced ${doctors.length} doctors to PostgreSQL.`);

  console.log('\n--- 3. Syncing Patients ---');
  const patients = await Patient.find({});
  console.log(`Found ${patients.length} patients in MongoDB.`);
  for (const pat of patients) {
    await dualWrite.syncPatient(pat);
  }
  console.log(`✅ Synced ${patients.length} patients to PostgreSQL.`);

  console.log('\n--- 4. Syncing Appointments ---');
  const appointments = await Appointment.find({});
  console.log(`Found ${appointments.length} appointments in MongoDB.`);
  for (const app of appointments) {
    await dualWrite.syncAppointment(app);
  }
  console.log(`✅ Synced ${appointments.length} appointments to PostgreSQL.`);

  console.log('\n--- 5. Syncing Messages ---');
  const messages = await Message.find({});
  console.log(`Found ${messages.length} messages in MongoDB.`);
  for (const msg of messages) {
    await dualWrite.syncMessage(msg);
  }
  console.log(`✅ Synced ${messages.length} messages to PostgreSQL.`);

  console.log('\n--- 6. Syncing Prescriptions ---');
  const prescriptions = await Prescription.find({});
  console.log(`Found ${prescriptions.length} prescriptions in MongoDB.`);
  for (const pres of prescriptions) {
    await dualWrite.syncPrescription(pres);
  }
  console.log(`✅ Synced ${prescriptions.length} prescriptions to PostgreSQL.`);

  console.log('\n--- 7. Syncing Medical Records ---');
  const records = await MedicalRecord.find({});
  console.log(`Found ${records.length} medical records in MongoDB.`);
  for (const rec of records) {
    await dualWrite.syncMedicalRecord(rec);
  }
  console.log(`✅ Synced ${records.length} medical records to PostgreSQL.`);

  console.log('\n🎉 ALL MONGODB DATA SUCCESSFULLY SYNCED TO POSTGRESQL!');
}

runSync()
  .catch((err) => {
    console.error('❌ Migration error:', err);
  })
  .finally(async () => {
    await mongoose.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  });
