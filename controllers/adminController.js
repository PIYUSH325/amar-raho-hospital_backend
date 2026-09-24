const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Contact = require('../models/Contact');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');
const Department = require('../models/Department');
const HospitalPolicy = require('../models/HospitalPolicy');
const AiSettings = require('../models/AiSettings');
const bcrypt = require('bcryptjs');
const notificationService = require('../services/notificationService');
const pdfModule = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { splitTextIntoChunks } = require('../ai/rag/documentLoader');

async function extractTextFromPdfBuffer(buffer) {
  if (typeof pdfModule === 'function') {
    const res = await pdfModule(buffer);
    return res.text || '';
  } else if (pdfModule.PDFParse) {
    const parser = new pdfModule.PDFParse({ data: buffer });
    try {
      const res = await parser.getText();
      return (typeof res === 'object' && res.text) ? res.text : (typeof res === 'string' ? res : '');
    } finally {
      if (typeof parser.destroy === 'function') {
        try { await parser.destroy(); } catch (_) {}
      }
    }
  } else if (typeof pdfModule.default === 'function') {
    const res = await pdfModule.default(buffer);
    return res.text || '';
  }
  throw new Error('Unsupported PDF parse module format');
}
const { generateEmbedding } = require('../ai/embeddings/embeddingService');
const dualWrite = require('../services/dualWrite');

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
exports.getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const totalAppointments = await Appointment.countDocuments();
    const totalContacts = await Contact.countDocuments();
    const totalHospitals = await Hospital.countDocuments();
    const totalDepartments = await Department.countDocuments();
    const totalPolicies = await HospitalPolicy.countDocuments();

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalDoctors,
        totalAppointments,
        totalContacts,
        totalHospitals,
        totalDepartments,
        totalPolicies
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Doctor account
// @route   POST /api/admin/doctors
exports.createDoctorAccount = async (req, res, next) => {
  try {
    const { name, email, password, specialization, experience, fees, bio, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'doctor'
    });

    const doctor = await Doctor.create({
      user: user._id,
      specialization: specialization || 'General Physician',
      experience: experience ? Number(experience) : 1,
      fees: fees ? Number(fees) : 500,
      bio: bio || '',
      isVerified: true,
      department: department || 'General'
    });

    res.status(201).json({
      success: true,
      message: 'Doctor account created successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        doctorInfo: doctor
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify/Activate a Doctor account
// @route   PUT /api/admin/doctors/:id/verify
exports.verifyDoctor = async (req, res, next) => {
  try {
    const { isVerified } = req.body;
    
    let doctor = await Doctor.findOne({ user: req.params.id });
    if (!doctor) {
      // Create profile on the fly if missing
      doctor = await Doctor.create({ user: req.params.id, isVerified });
    } else {
      doctor.isVerified = isVerified;
      await doctor.save();
    }

    res.json({ success: true, message: `Doctor verification updated`, data: doctor });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Doctor accounts list
// @route   GET /api/admin/doctors
exports.getDoctorsList = async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('-password').sort({ createdAt: -1 });
    
    // Fetch matching doctor metadata for each
    const doctorsWithMetadata = await Promise.all(doctors.map(async (doc) => {
      let docInfo = await Doctor.findOne({ user: doc._id });
      if (!docInfo) docInfo = await Doctor.create({ user: doc._id });
      return {
        _id: doc._id,
        name: doc.name,
        email: doc.email,
        createdAt: doc.createdAt,
        metadata: docInfo
      };
    }));

    res.json({ success: true, count: doctorsWithMetadata.length, data: doctorsWithMetadata });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Patients list
// @route   GET /api/admin/patients
exports.getPatientsList = async (req, res, next) => {
  try {
    const patients = await User.find({ role: 'patient' }).select('-password').sort({ createdAt: -1 });
    
        const patientsWithMetadata = await Promise.all(patients.map(async (pat) => {
      let patInfo = await Patient.findOne({ user: pat._id });
      if (!patInfo) patInfo = await Patient.create({ user: pat._id });
      
      // Filter out tasks created by other doctors
      let filteredDietPlan = patInfo.dietPlan || [];
      if (req.user && req.user.role === 'doctor') {
        filteredDietPlan = filteredDietPlan.filter(task => 
          task.createdBy && task.createdBy.toString() === req.user.id.toString()
        );
      }
      
      const patObj = patInfo.toObject();
      patObj.dietPlan = filteredDietPlan;

      return {
        _id: pat._id,
        name: pat.name,
        email: pat.email,
        createdAt: pat.createdAt,
        metadata: patObj
      };
    }));

    res.json({ success: true, count: patientsWithMetadata.length, data: patientsWithMetadata });
  } catch (error) {
    next(error);
  }
};

// @desc    Create/Update Patient profile metadata
// @route   PUT /api/admin/patients/:id
exports.updatePatientProfile = async (req, res, next) => {
  try {
    const { mobile, age, gender, bloodGroup, address, emergencyContact, dietPlan } = req.body;

    const fieldsToUpdate = {
      mobile,
      age: age ? Number(age) : null,
      gender,
      bloodGroup,
      address,
      emergencyContact
    };

    if (dietPlan !== undefined) {
      // 1. Fetch current doctor name to record attribution
      const doctorUser = await User.findById(req.user.id);
      const doctorName = doctorUser ? doctorUser.name : 'Doctor';

      // 2. Load existing patient profile to retrieve other doctors' tasks
      const existingPatient = await Patient.findOne({ user: req.params.id });
      let otherDoctorsTasks = [];
      if (existingPatient && existingPatient.dietPlan) {
        otherDoctorsTasks = existingPatient.dietPlan.filter(task => 
          task.createdBy && task.createdBy.toString() !== req.user.id.toString()
        );
      }

      // 3. Map new tasks with doctor identity stamps
      const newTasks = dietPlan.map(task => ({
        task: task.task,
        type: task.type,
        targetTime: task.targetTime,
        isCompleted: !!task.isCompleted,
        missedAlertSent: task.missedAlertSent !== undefined ? !!task.missedAlertSent : false,
        createdBy: req.user.id,
        doctorName: doctorName
      }));

      // 4. Merge preserving order
      fieldsToUpdate.dietPlan = [...otherDoctorsTasks, ...newTasks];
    }

    const patient = await Patient.findOneAndUpdate(
      { user: req.params.id },
      { $set: fieldsToUpdate },
      { new: true, upsert: true }
    );

    // 5. Security Filter: If role is doctor, only return current doctor's tasks in response
    const patientObj = patient.toObject();
    if (req.user && req.user.role === 'doctor') {
      patientObj.dietPlan = (patientObj.dietPlan || []).filter(task => 
        task.createdBy && task.createdBy.toString() === req.user.id.toString()
      );
    }

    res.json({ success: true, message: 'Patient profile updated successfully', data: patientObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all User accounts credentials
// @route   GET /api/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a User account (cascading)
// @route   DELETE /api/admin/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'patient') {
      await Patient.deleteOne({ user: user._id });
      await Appointment.deleteMany({ user: user._id });
    } else if (user.role === 'doctor') {
      await Doctor.deleteOne({ user: user._id });
      await Appointment.deleteMany({ doctorRef: user._id });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User account and all dependencies deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active appointments
// @route   GET /api/admin/appointments
exports.getAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status
// @route   PUT /api/admin/appointments/:id/status
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // Send Appointment Status Update Email (Non-blocking)
    notificationService.sendAppointmentStatusEmail(appointment, status);

    res.json({ success: true, message: 'Appointment status updated', data: appointment });
  } catch (error) {
    next(error);
  }
};

// Hospitals
exports.getHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find().sort({ createdAt: -1 });
    res.json({ success: true, count: hospitals.length, data: hospitals });
  } catch (error) {
    next(error);
  }
};

exports.createHospital = async (req, res, next) => {
  try {
    const { name, address, phone } = req.body;
    const hospital = await Hospital.create({ name, address, phone });
    res.status(201).json({ success: true, message: 'Hospital branch added', data: hospital });
  } catch (error) {
    next(error);
  }
};

exports.deleteHospital = async (req, res, next) => {
  try {
    await Hospital.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Hospital branch deleted' });
  } catch (error) {
    next(error);
  }
};

// Departments
exports.getDepartments = async (req, res, next) => {
  try {
    const depts = await Department.find().sort({ createdAt: -1 });
    res.json({ success: true, count: depts.length, data: depts });
  } catch (error) {
    next(error);
  }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const { name, description, facilities } = req.body;
    let formattedFacilities = [];
    if (Array.isArray(facilities)) {
      formattedFacilities = facilities;
    } else if (typeof facilities === 'string' && facilities.trim()) {
      formattedFacilities = facilities.split(',').map(s => s.trim()).filter(Boolean);
    }
    const dept = await Department.create({
      name,
      description,
      facilities: formattedFacilities
    });
    res.status(201).json({ success: true, message: 'Department registered', data: dept });
  } catch (error) {
    next(error);
  }
};

exports.deleteDepartment = async (req, res, next) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// HOSPITAL POLICIES (RAG VECTOR STORE)
// ==========================================

// @desc    Upload Hospital Policy PDF, extract text, generate vectors, save to MongoDB & PostgreSQL
// @route   POST /api/admin/policies
exports.uploadPolicyPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF file.' });
    }

    const { title, category } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Policy title is required.' });
    }

    const filePath = req.file.path;
    const dataBuffer = fs.readFileSync(filePath);

    // 1. Extract text from PDF buffer
    const rawText = await extractTextFromPdfBuffer(dataBuffer);
    const cleanText = (rawText || '').replace(/\r\n|\r/g, '\n').trim();

    if (!cleanText) {
      return res.status(400).json({ 
        success: false, 
        message: 'Could not extract readable text from this PDF. Please ensure the PDF contains selectable text, not only flattened images.' 
      });
    }

    // 2. Split text into semantic chunks for vector embedding
    const textChunks = splitTextIntoChunks(cleanText, 400, 50);

    // 3. Generate real vector embeddings for each chunk via Gemini
    const chunksWithEmbeddings = [];
    for (let i = 0; i < textChunks.length; i++) {
      const chunkText = textChunks[i];
      if (chunkText && chunkText.trim()) {
        const embedding = await generateEmbedding(chunkText);
        chunksWithEmbeddings.push({
          chunkIndex: i,
          text: chunkText,
          embedding: embedding
        });
      }
    }

    // 4. Save to MongoDB (which automatically triggers dual-write to PostgreSQL)
    const policy = await HospitalPolicy.create({
      title: title.trim(),
      category: category || 'General',
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      extractedText: cleanText,
      chunks: chunksWithEmbeddings
    });

    res.status(201).json({
      success: true,
      message: `Policy '${policy.title}' uploaded and synchronized to MongoDB & PostgreSQL with ${chunksWithEmbeddings.length} vector chunks!`,
      data: {
        id: policy._id,
        title: policy.title,
        category: policy.category,
        totalChunks: chunksWithEmbeddings.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all uploaded hospital policies for public visitors
// @route   GET /api/ai/policies
exports.getPublicPolicies = async (req, res, next) => {
  try {
    const policies = await HospitalPolicy.find()
      .select('-chunks.embedding')
      .sort({ createdAt: -1 });

    const formatted = policies.map(p => ({
      _id: p._id,
      title: p.title,
      category: p.category,
      fileName: p.fileName,
      fileUrl: p.fileUrl,
      fileSize: p.fileSize,
      extractedText: p.extractedText || '',
      createdAt: p.createdAt
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all uploaded hospital policies (Admin view)
// @route   GET /api/admin/policies
exports.getPolicies = async (req, res, next) => {
  try {
    const policies = await HospitalPolicy.find()
      .select('-chunks.embedding -extractedText')
      .sort({ createdAt: -1 });

    const formatted = policies.map(p => ({
      _id: p._id,
      title: p.title,
      category: p.category,
      fileName: p.fileName,
      fileUrl: p.fileUrl,
      fileSize: p.fileSize,
      totalChunks: p.chunks ? p.chunks.length : 0,
      createdAt: p.createdAt
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a policy from both MongoDB and PostgreSQL
// @route   DELETE /api/admin/policies/:id
exports.deletePolicy = async (req, res, next) => {
  try {
    const policy = await HospitalPolicy.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    // Delete physical file from uploads folder
    const fullFilePath = path.join(__dirname, '../uploads', policy.fileName);
    if (fs.existsSync(fullFilePath)) {
      try { fs.unlinkSync(fullFilePath); } catch (e) {}
    }

    // Delete from MongoDB
    await HospitalPolicy.findByIdAndDelete(req.params.id);

    // Delete from PostgreSQL
    await dualWrite.deleteHospitalPolicy(req.params.id);

    res.json({ success: true, message: 'Policy deleted from both MongoDB and PostgreSQL' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// AI ASSISTANT SETTINGS & SYSTEM PROMPT
// ==========================================

// @desc    Get current AI Assistant settings (or initialize default)
// @route   GET /api/admin/ai-settings
exports.getAiSettings = async (req, res, next) => {
  try {
    let settings = await AiSettings.findOne();
    if (!settings) {
      settings = await AiSettings.create({});
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public AI Assistant settings (for web visitors & chat widget)
// @route   GET /api/ai/settings
exports.getPublicAiSettings = async (req, res, next) => {
  try {
    let settings = await AiSettings.findOne().lean();
    if (!settings) {
      settings = await AiSettings.create({});
    }
    res.json({
      success: true,
      data: {
        hospitalName: settings.hospitalName,
        welcomeGreeting: settings.welcomeGreeting,
        operatingHours: settings.operatingHours,
        emergencyPhone: settings.emergencyPhone,
        supportEmail: settings.supportEmail,
        address: settings.address
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update AI Assistant settings
// @route   PUT /api/admin/ai-settings
exports.updateAiSettings = async (req, res, next) => {
  try {
    const {
      hospitalName,
      address,
      emergencyPhone,
      supportEmail,
      operatingHours,
      botPersonality,
      welcomeGreeting,
      outOfScopeRules,
      customInstructions
    } = req.body;

    let settings = await AiSettings.findOne();
    if (!settings) {
      settings = new AiSettings();
    }

    if (hospitalName !== undefined) settings.hospitalName = hospitalName.trim();
    if (address !== undefined) settings.address = address.trim();
    if (emergencyPhone !== undefined) settings.emergencyPhone = emergencyPhone.trim();
    if (supportEmail !== undefined) settings.supportEmail = supportEmail.trim();
    if (operatingHours !== undefined) settings.operatingHours = operatingHours.trim();
    if (botPersonality !== undefined) settings.botPersonality = botPersonality.trim();
    if (welcomeGreeting !== undefined) settings.welcomeGreeting = welcomeGreeting.trim();
    if (outOfScopeRules !== undefined) settings.outOfScopeRules = outOfScopeRules.trim();
    if (customInstructions !== undefined) settings.customInstructions = customInstructions.trim();

    settings.updatedAt = new Date();
    if (req.user && req.user.id) {
      settings.updatedBy = req.user.id;
    }

    await settings.save();

    res.json({
      success: true,
      message: 'AI Assistant settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

