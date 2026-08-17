const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');

// @desc    Add a medical record entry

// @route   POST /api/medical-records
// @access  Private (Doctor only)
exports.createRecord = async (req, res, next) => {
  try {
    const { patientId, diagnosis, treatmentPlan, notes } = req.body;

    if (!patientId || !diagnosis || !treatmentPlan) {
      return res.status(400).json({ success: false, message: 'Patient, diagnosis, and treatment plan are required' });
    }

    const record = await MedicalRecord.create({
      patient: patientId,
      doctor: req.user.id,
      diagnosis,
      treatmentPlan,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Medical record created successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get medical record history
// @route   GET /api/medical-records
// @access  Private
exports.getRecords = async (req, res, next) => {
  try {
    let records;
    if (req.user.role === 'patient') {
      records = await MedicalRecord.find({ patient: req.user.id })
        .populate('doctor', 'name email')
        .sort({ visitDate: -1 });
    } else if (req.user.role === 'doctor') {
      const filter = req.query.patientId 
        ? { patient: req.query.patientId, doctor: req.user.id }
        : { doctor: req.user.id };
      records = await MedicalRecord.find(filter)
        .populate('patient', 'name email')
        .populate('doctor', 'name email')
        .sort({ visitDate: -1 });
    } else {
      // Admin sees all
      const filter = req.query.patientId ? { patient: req.query.patientId } : {};
      records = await MedicalRecord.find(filter)
        .populate('patient', 'name email')
        .populate('doctor', 'name email')
        .sort({ visitDate: -1 });
    }
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};
