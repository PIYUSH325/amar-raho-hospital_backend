const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const emailService = require('./emailService');

// Standard outpatient consultation slots
const STANDARD_SLOTS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '02:00 PM',
  '02:30 PM'
];

/**
 * Cleanly formats doctor name with single 'Dr.' title prefix.
 */
const formatDoctorName = (name) => {
  if (!name) return 'Doctor';
  return name.startsWith('Dr.') ? name : `Dr. ${name}`;
};

/**
 * Normalizes user time strings like "10 AM", "10am", "10:00", "14:30" to standard "HH:mm AM/PM".
 */
const normalizeTime = (timeStr) => {
  if (!timeStr) return '10:00 AM';
  const clean = timeStr.trim();

  // Match e.g. "10", "10:00", "10 AM", "10:30 PM", "14:30"
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return clean;

  let hours = parseInt(match[1], 10);
  let minutes = match[2] ? parseInt(match[2], 10) : 0;
  let modifier = match[3] ? match[3].toUpperCase() : null;

  if (!modifier) {
    if (hours >= 12 && hours < 24) {
      if (hours > 12) hours -= 12;
      modifier = 'PM';
    } else if (hours === 12) {
      modifier = 'PM';
    } else {
      modifier = 'AM';
    }
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${modifier}`;
};

/**
 * Normalizes date to YYYY-MM-DD.
 */
const normalizeDate = (dateStr) => {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  const parsed = new Date(clean);
  if (isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
};

/**
 * Resolves doctor User and Doctor profile by ID, name, or department.
 */
const findDoctor = async ({ doctorId, doctorName, department }) => {
  let userDoc = null;
  let profileDoc = null;

  // 1. By ID
  if (doctorId) {
    // Try user ID first
    userDoc = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (userDoc) {
      profileDoc = await Doctor.findOne({ user: userDoc._id });
      return { userDoc, profileDoc };
    }

    // Try Doctor profile ID
    profileDoc = await Doctor.findById(doctorId).populate('user');
    if (profileDoc && profileDoc.user) {
      return { userDoc: profileDoc.user, profileDoc };
    }
  }

  // 2. By Doctor Name (fuzzy match)
  if (doctorName) {
    const cleanName = doctorName.replace(/^Dr\.?\s*/i, '').trim();
    const regex = new RegExp(cleanName, 'i');

    userDoc = await User.findOne({
      role: 'doctor',
      name: { $regex: regex }
    });

    if (userDoc) {
      profileDoc = await Doctor.findOne({ user: userDoc._id });
      return { userDoc, profileDoc };
    }
  }

  // 3. By Department (first available doctor in department)
  if (department) {
    const cleanDept = department.trim();
    profileDoc = await Doctor.findOne({
      $or: [
        { department: new RegExp(cleanDept, 'i') },
        { specialization: new RegExp(cleanDept, 'i') }
      ],
      isPresenceActive: { $ne: false }
    }).populate('user');

    if (profileDoc && profileDoc.user) {
      return { userDoc: profileDoc.user, profileDoc };
    }
  }

  return { userDoc: null, profileDoc: null };
};

/**
 * Checks real-time doctor availability and identifies alternative slots if booked.
 */
const checkDoctorAvailability = async ({ doctorName, doctorId, department, date, time }) => {
  const { userDoc, profileDoc } = await findDoctor({ doctorId, doctorName, department });

  if (!userDoc) {
    const allDoctors = await User.find({ role: 'doctor' }).select('name').lean();
    return {
      success: false,
      isAvailable: false,
      error: `Doctor '${doctorName || department || 'requested'}' was not found in our hospital database.`,
      availableDoctors: allDoctors.map(d => d.name)
    };
  }

  const isPresenceActive = profileDoc ? profileDoc.isPresenceActive !== false : true;
  if (!isPresenceActive) {
    return {
      success: false,
      isAvailable: false,
      doctorName: userDoc.name,
      error: `${formatDoctorName(userDoc.name)} is currently on leave and unavailable for consultations.`,
    };
  }

  const normDate = normalizeDate(date);
  const normTime = normalizeTime(time);

  // If date & time are provided, check specific booking conflict
  if (normDate && normTime) {
    // Check day of week
    const dateObj = new Date(normDate);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[dateObj.getDay()];

    const allowedDays = profileDoc?.availability || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (!allowedDays.includes(dayOfWeek)) {
      return {
        success: false,
        isAvailable: false,
        doctorName: userDoc.name,
        error: `${formatDoctorName(userDoc.name)} is not on duty on ${dayOfWeek}s. Scheduled days: ${allowedDays.join(', ')}.`,
        allowedDays
      };
    }

    // Check existing scheduled/approved appointments
    const bookedAppt = await Appointment.findOne({
      doctorRef: userDoc._id,
      date: normDate,
      time: normTime,
      status: { $in: ['Scheduled', 'Approved'] }
    });

    if (bookedAppt) {
      // Find alternative open slots for this doctor on that date
      const bookedOnDate = await Appointment.find({
        doctorRef: userDoc._id,
        date: normDate,
        status: { $in: ['Scheduled', 'Approved'] }
      }).select('time').lean();

      const bookedTimes = new Set(bookedOnDate.map(a => normalizeTime(a.time)));
      const availableAlternatives = STANDARD_SLOTS.filter(slot => !bookedTimes.has(slot));

      return {
        success: true,
        isAvailable: false,
        doctorName: userDoc.name,
        doctorId: userDoc._id.toString(),
        department: profileDoc?.department || 'General',
        specialization: profileDoc?.specialization || 'Physician',
        requestedDate: normDate,
        requestedTime: normTime,
        message: `${formatDoctorName(userDoc.name)} is not available at ${normTime}.`,
        availableAlternatives: availableAlternatives.slice(0, 3)
      };
    }

    // Available for booking!
    return {
      success: true,
      isAvailable: true,
      doctorId: userDoc._id.toString(),
      doctorName: userDoc.name,
      department: profileDoc?.department || 'General',
      specialization: profileDoc?.specialization || 'Physician',
      consultationFee: `Rs. ${profileDoc?.fees || 500}`,
      requestedDate: normDate,
      requestedTime: normTime,
      requiresConfirmation: true,
      suggestedConfirmation: `You are requesting an appointment with ${formatDoctorName(userDoc.name)}${profileDoc?.department ? ` in ${profileDoc.department}` : ''} on ${normDate} at ${normTime}. Shall I confirm the booking?`
    };
  }

  // Generic availability lookup
  return {
    success: true,
    isAvailable: true,
    doctorId: userDoc._id.toString(),
    doctorName: userDoc.name,
    department: profileDoc?.department || 'General',
    specialization: profileDoc?.specialization || 'Physician',
    consultationFee: `Rs. ${profileDoc?.fees || 500}`,
    workingDays: profileDoc?.availability || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    timings: '09:00 AM - 12:00 PM'
  };
};

/**
 * Books an appointment on behalf of an authenticated patient.
 * Validates patient identity, doctor, date/time, double-booking, creates record, and sends email.
 */
const bookAppointment = async ({
  patientId,
  doctorId,
  doctorName,
  department,
  appointmentDate,
  appointmentTime,
  reason = 'General Consultation',
  notes = '',
  authenticatedUser = null
}) => {
  // 1. Enforce patient authentication
  const authUserId = authenticatedUser?.id || authenticatedUser?._id;
  if (!authUserId) {
    return {
      success: false,
      error: 'Authentication required. An active patient account is required to book an appointment.',
      requiresAuth: true
    };
  }

  const patientUser = await User.findById(authUserId);
  if (!patientUser) {
    return {
      success: false,
      error: 'Authenticated patient record not found in system.',
      requiresAuth: true
    };
  }

  if (!patientUser.email) {
    return {
      success: false,
      error: 'Patient registered email address is missing. Please update your profile with a valid email.'
    };
  }

  // Retrieve patient mobile if available
  const patientProfile = await Patient.findOne({ user: patientUser._id });
  const patientMobile = patientProfile?.mobile || 'Not Provided';

  // 2. Validate Doctor
  const { userDoc, profileDoc } = await findDoctor({ doctorId, doctorName, department });
  if (!userDoc) {
    return {
      success: false,
      error: `Doctor '${doctorName || doctorId || 'requested'}' does not exist.`
    };
  }

  // 3. Validate Date & Time
  const normDate = normalizeDate(appointmentDate);
  const normTime = normalizeTime(appointmentTime);

  if (!normDate) {
    return {
      success: false,
      error: 'Invalid appointment date format. Please specify a valid date (YYYY-MM-DD).'
    };
  }

  if (!normTime) {
    return {
      success: false,
      error: 'Invalid appointment time. Please provide a preferred time (e.g. 10:00 AM).'
    };
  }

  // Prevent past dates
  const todayStr = normalizeDate(new Date().toISOString());
  if (normDate < todayStr) {
    return {
      success: false,
      error: 'Cannot book appointments for past dates. Please choose a future date.'
    };
  }

  // 4. Double-Booking Prevention Check
  const existingAppt = await Appointment.findOne({
    doctorRef: userDoc._id,
    date: normDate,
    time: normTime,
    status: { $in: ['Scheduled', 'Approved'] }
  });

  if (existingAppt) {
    // Find alternatives
    const bookedOnDate = await Appointment.find({
      doctorRef: userDoc._id,
      date: normDate,
      status: { $in: ['Scheduled', 'Approved'] }
    }).select('time').lean();

    const bookedTimes = new Set(bookedOnDate.map(a => normalizeTime(a.time)));
    const availableAlternatives = STANDARD_SLOTS.filter(slot => !bookedTimes.has(slot));

    return {
      success: false,
      error: `${formatDoctorName(userDoc.name)} is already booked at ${normTime} on ${normDate}.`,
      isDoubleBooking: true,
      availableAlternatives: availableAlternatives.slice(0, 3)
    };
  }

  // 5. Generate human-readable appointment ID
  const appointmentId = `ARH-${Math.floor(10000 + Math.random() * 90000)}`;

  // 6. Create Appointment in Database
  let appointment;
  try {
    appointment = await Appointment.create({
      user: patientUser._id,
      doctorRef: userDoc._id,
      name: patientUser.name,
      email: patientUser.email,
      mobile: patientMobile,
      doctor: userDoc.name,
      date: normDate,
      time: normTime,
      problem: reason || 'General Consultation',
      notes: notes || '',
      status: 'Scheduled',
      appointmentId,
      confirmationEmailStatus: 'pending'
    });
  } catch (dbErr) {
    console.error('❌ [AppointmentService] Database creation error:', dbErr.message);
    return {
      success: false,
      error: 'Database error occurred while saving appointment. Please try again.'
    };
  }

  // 7. Trigger Email Notification Service
  let emailSent = false;
  let emailError = null;

  try {
    await emailService.sendAppointmentConfirmation({
      patientName: patientUser.name,
      patientEmail: patientUser.email,
      doctorName: userDoc.name,
      specialization: profileDoc?.specialization || profileDoc?.department || 'General Physician',
      appointmentDate: normDate,
      appointmentTime: normTime,
      appointmentId: appointment.appointmentId,
      reason: appointment.problem,
      notes: appointment.notes
    });

    emailSent = true;
    appointment.confirmationEmailStatus = 'sent';
    await appointment.save();
    console.log(`✅ [AppointmentService] Confirmation email successfully delivered to ${patientUser.email}`);
  } catch (mailErr) {
    console.error('⚠️ [AppointmentService] Confirmation email sending failed:', mailErr.message);
    emailError = mailErr.message;
    appointment.confirmationEmailStatus = 'failed';
    await appointment.save();
  }

  return {
    success: true,
    message: 'Appointment booked successfully',
    data: appointment,
    appointmentId: appointment.appointmentId,
    doctorName: userDoc.name,
    department: profileDoc?.department || 'General',
    specialization: profileDoc?.specialization || 'Physician',
    appointmentDate: normDate,
    appointmentTime: normTime,
    patientName: patientUser.name,
    patientEmail: patientUser.email,
    emailSent,
    emailStatus: appointment.confirmationEmailStatus,
    emailError
  };
};

module.exports = {
  checkDoctorAvailability,
  bookAppointment,
  findDoctor,
  normalizeDate,
  normalizeTime,
  STANDARD_SLOTS
};
