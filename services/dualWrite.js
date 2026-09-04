const prisma = require('../config/prisma');

/**
 * Non-blocking dual-write sync helpers
 * Ensures every record saved to MongoDB is asynchronously mirrored into PostgreSQL
 */

exports.syncUser = async (userDoc) => {
  if (!userDoc || !userDoc._id) return;
  try {
    const id = userDoc._id.toString();
    await prisma.user.upsert({
      where: { id },
      update: {
        name: userDoc.name || 'Unknown',
        email: userDoc.email,
        password: userDoc.password || '',
        role: userDoc.role || 'patient',
      },
      create: {
        id,
        name: userDoc.name || 'Unknown',
        email: userDoc.email,
        password: userDoc.password || '',
        role: userDoc.role || 'patient',
        createdAt: userDoc.createdAt ? new Date(userDoc.createdAt) : new Date(),
      },
    });
  } catch (err) {
    console.warn('⚠️ [DualWrite] syncUser warning:', err.message);
  }
};

exports.syncDoctor = async (doctorDoc) => {
  if (!doctorDoc || !doctorDoc.user) return;
  try {
    const userId = doctorDoc.user._id ? doctorDoc.user._id.toString() : doctorDoc.user.toString();
    const id = doctorDoc._id ? doctorDoc._id.toString() : userId;

    await prisma.doctorProfile.upsert({
      where: { userId },
      update: {
        specialization: doctorDoc.specialization || 'General Physician',
        experience: Number(doctorDoc.experience) || 1,
        fees: Number(doctorDoc.fees) || 500,
        bio: doctorDoc.bio || '',
        department: doctorDoc.department || 'General',
        isPresenceActive: doctorDoc.isPresenceActive !== false,
        isVerified: !!doctorDoc.isVerified,
      },
      create: {
        id,
        userId,
        specialization: doctorDoc.specialization || 'General Physician',
        experience: Number(doctorDoc.experience) || 1,
        fees: Number(doctorDoc.fees) || 500,
        bio: doctorDoc.bio || '',
        department: doctorDoc.department || 'General',
        isPresenceActive: doctorDoc.isPresenceActive !== false,
        isVerified: !!doctorDoc.isVerified,
        createdAt: doctorDoc.createdAt ? new Date(doctorDoc.createdAt) : new Date(),
      },
    });
  } catch (err) {
    console.warn('⚠️ [DualWrite] syncDoctor warning:', err.message);
  }
};

exports.syncPatient = async (patientDoc) => {
  if (!patientDoc || !patientDoc.user) return;
  try {
    const userId = patientDoc.user._id ? patientDoc.user._id.toString() : patientDoc.user.toString();
    const id = patientDoc._id ? patientDoc._id.toString() : userId;

    await prisma.patientProfile.upsert({
      where: { userId },
      update: {
        mobile: patientDoc.mobile || '',
        age: patientDoc.age ? Number(patientDoc.age) : null,
        gender: patientDoc.gender || '',
        bloodGroup: patientDoc.bloodGroup || '',
        emergencyContact: patientDoc.emergencyContact || '',
        address: patientDoc.address || '',
        reports: patientDoc.reports ? JSON.parse(JSON.stringify(patientDoc.reports)) : [],
        dietPlan: patientDoc.dietPlan ? JSON.parse(JSON.stringify(patientDoc.dietPlan)) : [],
      },
      create: {
        id,
        userId,
        mobile: patientDoc.mobile || '',
        age: patientDoc.age ? Number(patientDoc.age) : null,
        gender: patientDoc.gender || '',
        bloodGroup: patientDoc.bloodGroup || '',
        emergencyContact: patientDoc.emergencyContact || '',
        address: patientDoc.address || '',
        reports: patientDoc.reports ? JSON.parse(JSON.stringify(patientDoc.reports)) : [],
        dietPlan: patientDoc.dietPlan ? JSON.parse(JSON.stringify(patientDoc.dietPlan)) : [],
        createdAt: patientDoc.createdAt ? new Date(patientDoc.createdAt) : new Date(),
      },
    });
  } catch (err) {
    console.warn('⚠️ [DualWrite] syncPatient warning:', err.message);
  }
};

exports.syncAppointment = async (appDoc) => {
  if (!appDoc || !appDoc._id) return;
  try {
    const id = appDoc._id.toString();
    const patientId = appDoc.user ? (appDoc.user._id ? appDoc.user._id.toString() : appDoc.user.toString()) : null;
    if (!patientId) return;

    const doctorId = appDoc.doctorRef ? (appDoc.doctorRef._id ? appDoc.doctorRef._id.toString() : appDoc.doctorRef.toString()) : null;

    await prisma.appointment.upsert({
      where: { id },
      update: {
        name: appDoc.name || '',
        email: appDoc.email || '',
        mobile: appDoc.mobile || '',
        doctor: appDoc.doctor || '',
        date: appDoc.date || '',
        time: appDoc.time || '',
        problem: appDoc.problem || '',
        status: appDoc.status || 'Scheduled',
        doctorId: doctorId || undefined,
      },
      create: {
        id,
        patientId,
        doctorId: doctorId || undefined,
        name: appDoc.name || '',
        email: appDoc.email || '',
        mobile: appDoc.mobile || '',
        doctor: appDoc.doctor || '',
        date: appDoc.date || '',
        time: appDoc.time || '',
        problem: appDoc.problem || '',
        status: appDoc.status || 'Scheduled',
        createdAt: appDoc.createdAt ? new Date(appDoc.createdAt) : new Date(),
      },
    });
  } catch (err) {
    console.warn('⚠️ [DualWrite] syncAppointment warning:', err.message);
  }
};

exports.syncMessage = async (msgDoc) => {
  if (!msgDoc || !msgDoc._id) return;
  try {
    const id = msgDoc._id.toString();
    const senderId = msgDoc.sender ? (msgDoc.sender._id ? msgDoc.sender._id.toString() : msgDoc.sender.toString()) : null;
    if (!senderId) return;

    const recipientId = msgDoc.recipient ? (msgDoc.recipient._id ? msgDoc.recipient._id.toString() : msgDoc.recipient.toString()) : null;
    const patientId = msgDoc.patient ? (msgDoc.patient._id ? msgDoc.patient._id.toString() : msgDoc.patient.toString()) : null;
    const doctorId = msgDoc.doctor ? (msgDoc.doctor._id ? msgDoc.doctor._id.toString() : msgDoc.doctor.toString()) : null;

    await prisma.message.upsert({
      where: { id },
      update: {
        text: msgDoc.text || '',
        messageType: msgDoc.messageType || 'text',
        fileUrl: msgDoc.fileUrl || null,
        fileName: msgDoc.fileName || null,
        fileSize: msgDoc.fileSize || null,
        duration: msgDoc.duration ? Number(msgDoc.duration) : null,
        recipientId: recipientId || null,
        patientId: patientId || null,
        doctorId: doctorId || null,
      },
      create: {
        id,
        senderId,
        recipientId: recipientId || null,
        patientId: patientId || null,
        doctorId: doctorId || null,
        text: msgDoc.text || '',
        messageType: msgDoc.messageType || 'text',
        fileUrl: msgDoc.fileUrl || null,
        fileName: msgDoc.fileName || null,
        fileSize: msgDoc.fileSize || null,
        duration: msgDoc.duration ? Number(msgDoc.duration) : null,
        createdAt: msgDoc.createdAt ? new Date(msgDoc.createdAt) : new Date(),
      },
    });
  } catch (err) {
    console.warn('⚠️ [DualWrite] syncMessage warning:', err.message);
  }
};

exports.syncPrescription = async (presDoc) => {
  if (!presDoc || !presDoc._id) return;
  try {
    const id = presDoc._id.toString();
    const patientId = presDoc.patient ? (presDoc.patient._id ? presDoc.patient._id.toString() : presDoc.patient.toString()) : null;
    if (!patientId) return;

    await prisma.prescription.upsert({
      where: { id },
      update: {
        medicines: presDoc.medicines ? JSON.parse(JSON.stringify(presDoc.medicines)) : [],
        instructions: presDoc.instructions || '',
      },
      create: {
        id,
        patientId,
        medicines: presDoc.medicines ? JSON.parse(JSON.stringify(presDoc.medicines)) : [],
        instructions: presDoc.instructions || '',
        createdAt: presDoc.createdAt ? new Date(presDoc.createdAt) : new Date(),
      },
    });
  } catch (err) {
    console.warn('⚠️ [DualWrite] syncPrescription warning:', err.message);
  }
};

exports.syncMedicalRecord = async (recDoc) => {
  if (!recDoc || !recDoc._id) return;
  try {
    const id = recDoc._id.toString();
    const patientId = recDoc.patient ? (recDoc.patient._id ? recDoc.patient._id.toString() : recDoc.patient.toString()) : null;
    if (!patientId) return;

    await prisma.medicalRecord.upsert({
      where: { id },
      update: {
        diagnosis: recDoc.diagnosis || '',
        treatmentPlan: recDoc.treatmentPlan || '',
        notes: recDoc.notes || '',
        visitDate: recDoc.visitDate ? new Date(recDoc.visitDate).toISOString() : null,
      },
      create: {
        id,
        patientId,
        diagnosis: recDoc.diagnosis || '',
        treatmentPlan: recDoc.treatmentPlan || '',
        notes: recDoc.notes || '',
        visitDate: recDoc.visitDate ? new Date(recDoc.visitDate).toISOString() : null,
        createdAt: recDoc.createdAt ? new Date(recDoc.createdAt) : new Date(),
      },
    });
  } catch (err) {
    console.warn('⚠️ [DualWrite] syncMedicalRecord warning:', err.message);
  }
};
