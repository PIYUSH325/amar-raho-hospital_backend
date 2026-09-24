/**
 * Doctor Tools Layer
 * Fetches real-time clinic schedule, available appointment slots, and consultation details.
 * Connects directly to PostgreSQL via Prisma with graceful hospital roster fallback.
 */
let prisma = null;
try {
  prisma = require('../../config/prisma');
} catch (err) {
  console.warn('Prisma client not initialized in doctorTools.');
}

let Doctor = null;
let User = null;
try {
  User = require('../../models/User');
  Doctor = require('../../models/Doctor');
} catch (err) {
  console.warn('Mongoose Doctor/User models not initialized in doctorTools.');
}

const appointmentService = require('../../services/appointmentService');

/**
 * Fetches all registered doctors from the database (checking PostgreSQL Prisma first, MongoDB Doctor second).
 */
async function fetchAllDatabaseDoctors() {
  if (prisma) {
    try {
      const dbDoctors = await prisma.user.findMany({
        where: { role: 'doctor' },
        include: { doctorProfile: true }
      });
      if (dbDoctors && dbDoctors.length > 0) {
        return dbDoctors.map(doc => {
          const p = doc.doctorProfile || {};
          return {
            name: doc.name,
            department: p.department || "General",
            specialization: p.specialization || "Physician",
            experience: `${p.experience || 5} years`,
            fee: `Rs. ${p.fees || 500}`,
            status: p.isPresenceActive ? "Available" : "On Leave",
            timings: "09:00 AM - 12:00 PM (Mon-Fri)"
          };
        });
      }
    } catch (err) {
      console.warn("Prisma query warning in fetchAllDatabaseDoctors:", err.message);
    }
  }

  if (Doctor) {
    try {
      const mongoDocs = await Doctor.find().populate('user').lean();
      if (mongoDocs && mongoDocs.length > 0) {
        return mongoDocs.map(d => ({
          name: d.user?.name || "Doctor",
          department: d.department || "General",
          specialization: d.specialization || "Physician",
          experience: `${d.experience || 5} years`,
          fee: `Rs. ${d.fees || 500}`,
          status: d.isPresenceActive ? "Available" : "On Leave",
          timings: "09:00 AM - 12:00 PM (Mon-Fri)"
        }));
      }
    } catch (err) {
      console.warn("MongoDB Doctor query warning in fetchAllDatabaseDoctors:", err.message);
    }
  }

  return [];
}

/**
 * Fetches real-time doctor availability and details strictly from the live database.
 */
async function getDoctorAvailability({ doctorName = "", department = "", date = "", time = "" } = {}) {
  // 1. If checking a specific appointment slot or doctor, use centralized appointmentService
  try {
    const serviceResult = await appointmentService.checkDoctorAvailability({
      doctorName,
      department,
      date,
      time
    });

    if (serviceResult) {
      return serviceResult;
    }
  } catch (svcErr) {
    console.warn("appointmentService.checkDoctorAvailability warning in doctorTools:", svcErr.message);
  }

  const docClean = (doctorName || "").toLowerCase().trim();
  const deptClean = (department || "").toLowerCase().trim();

  // 2. Attempt live DB query via Prisma (PostgreSQL)
  if (prisma) {
    try {
      const dbDoctors = await prisma.user.findMany({
        where: {
          role: 'doctor',
          OR: [
            docClean ? { name: { contains: docClean, mode: 'insensitive' } } : undefined,
            deptClean ? { doctorProfile: { department: { contains: deptClean, mode: 'insensitive' } } } : undefined,
            deptClean ? { doctorProfile: { specialization: { contains: deptClean, mode: 'insensitive' } } } : undefined,
          ].filter(Boolean)
        },
        include: {
          doctorProfile: true,
          doctorAppointments: {
            where: { status: 'Scheduled' }
          }
        },
        take: 5
      });

      if (dbDoctors && dbDoctors.length > 0) {
        const formattedDoctors = dbDoctors.map(doc => {
          const profile = doc.doctorProfile || {};
          return {
            doctor: doc.name,
            department: profile.department || department || "General",
            specialization: profile.specialization || "Physician",
            experience: `${profile.experience || 5} years`,
            consultation_fee: `Rs. ${profile.fees || 500}`,
            status: profile.isPresenceActive ? "Available" : "On Leave",
            working_days: "Monday to Friday",
            timing_window: "09:00 AM - 12:00 PM",
            scheduled_appointments_today: doc.doctorAppointments ? doc.doctorAppointments.length : 0,
            source: "Live Database (PostgreSQL Prisma)"
          };
        });

        return {
          total_matches: formattedDoctors.length,
          matched_doctors: formattedDoctors,
          primary_doctor: formattedDoctors[0],
          source: "Live Database (PostgreSQL Prisma)"
        };
      }
    } catch (dbErr) {
      console.warn("Prisma query warning in getDoctorAvailability:", dbErr.message);
    }
  }

  // 3. Attempt live query via MongoDB Doctor model
  if (Doctor) {
    try {
      const mongoDocs = await Doctor.find().populate('user').lean();
      const matched = mongoDocs.filter(d => {
        const name = (d.user?.name || "").toLowerCase();
        const dept = (d.department || "").toLowerCase();
        const spec = (d.specialization || "").toLowerCase();
        return (
          (docClean && name.includes(docClean)) ||
          (deptClean && (dept.includes(deptClean) || spec.includes(deptClean)))
        );
      });

      if (matched.length > 0) {
        const formatted = matched.map(d => ({
          doctor: d.user?.name || "Doctor",
          department: d.department || "General",
          specialization: d.specialization || "Physician",
          experience: `${d.experience || 5} years`,
          consultation_fee: `Rs. ${d.fees || 500}`,
          status: d.isPresenceActive ? "Available" : "On Leave",
          working_days: "Monday to Friday",
          timing_window: "09:00 AM - 12:00 PM",
          source: "Live Database (MongoDB Doctor)"
        }));

        return {
          total_matches: formatted.length,
          matched_doctors: formatted,
          primary_doctor: formatted[0],
          source: "Live Database (MongoDB Doctor)"
        };
      }
    } catch (err) {
      console.warn("MongoDB query warning in getDoctorAvailability:", err.message);
    }
  }

  // 4. Fallback: list all doctors
  const allLiveDoctors = await fetchAllDatabaseDoctors();
  const activeDoctorList = allLiveDoctors.map(d => `${d.name} (${d.department})`);

  return {
    error: `Doctor or specialty '${doctorName || department}' not found in the live hospital database.`,
    available_doctors: activeDoctorList
  };
}

/**
 * Books an appointment for the authenticated patient via the AI assistant.
 * Enforces security by binding the booking to the authenticated session context.
 */
async function bookDoctorAppointment(toolArgs = {}, context = {}) {
  const userContext = context.userContext || null;

  if (!userContext || (!userContext.id && !userContext._id)) {
    return {
      success: false,
      bookingSuccess: false,
      error: 'Authentication required. Please log in or register your account before booking an appointment.',
      requiresAuth: true
    };
  }

  const {
    doctorId,
    doctorName,
    department,
    appointmentDate,
    appointmentTime,
    reason,
    notes
  } = toolArgs;

  const result = await appointmentService.bookAppointment({
    doctorId,
    doctorName,
    department,
    appointmentDate,
    appointmentTime,
    reason: reason || 'General Consultation',
    notes: notes || '',
    authenticatedUser: userContext
  });

  if (!result.success) {
    return {
      success: false,
      bookingSuccess: false,
      error: result.error,
      isDoubleBooking: result.isDoubleBooking || false,
      availableAlternatives: result.availableAlternatives || [],
      requiresAuth: result.requiresAuth || false
    };
  }

  return {
    success: true,
    bookingSuccess: true,
    appointmentId: result.appointmentId,
    doctorName: result.doctorName,
    department: result.department,
    specialization: result.specialization,
    appointmentDate: result.appointmentDate,
    appointmentTime: result.appointmentTime,
    patientName: result.patientName,
    patientEmail: result.patientEmail,
    emailSent: result.emailSent,
    emailStatus: result.emailStatus,
    emailError: result.emailError
  };
}

/**
 * Returns the complete list of registered hospital physicians strictly from the live database.
 */
async function listAllDoctors() {
  const doctors = await fetchAllDatabaseDoctors();

  return {
    total_registered_doctors: doctors.length,
    doctors: doctors.map(doc => ({
      name: doc.name,
      department: doc.department,
      specialization: doc.specialization,
      experience: doc.experience,
      consultation_fee: doc.fee,
      status: doc.status,
      timings: doc.timings
    })),
    source: "Live Hospital Database"
  };
}

module.exports = {
  getDoctorAvailability,
  bookDoctorAppointment,
  listAllDoctors,
};
