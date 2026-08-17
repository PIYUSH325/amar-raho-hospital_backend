const Prescription = require('../models/Prescription');

// @desc    Issue a new prescription
// @route   POST /api/prescriptions
// @access  Private (Doctor only)
exports.createPrescription = async (req, res, next) => {
  try {
    const { patientId, medicines, instructions } = req.body;

    if (!patientId || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ success: false, message: 'Patient and a list of medicines are required' });
    }

    const prescription = await Prescription.create({
      patient: patientId,
      doctor: req.user.id,
      medicines,
      instructions
    });

    res.status(201).json({
      success: true,
      message: 'Prescription issued successfully',
      data: prescription
    });
  } catch (error) {
    next(error);
  }
};

exports.getPrescriptions = async (req, res, next) => {
  try {
    let prescriptions;
    if (req.user.role === 'patient') {
      prescriptions = await Prescription.find({ patient: req.user.id })
        .populate('doctor', 'name email')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'doctor') {
      const filter = req.query.patientId 
        ? { patient: req.query.patientId, doctor: req.user.id }
        : { doctor: req.user.id };
      prescriptions = await Prescription.find(filter)
        .populate('patient', 'name email')
        .populate('doctor', 'name email')
        .sort({ createdAt: -1 });
    } else {
      // Admin sees all
      const filter = req.query.patientId ? { patient: req.query.patientId } : {};
      prescriptions = await Prescription.find(filter)
        .populate('patient', 'name email')
        .populate('doctor', 'name email')
        .sort({ createdAt: -1 });
    }
    res.json({ success: true, count: prescriptions.length, data: prescriptions });
  } catch (error) {
    next(error);
  }
};


exports.updatePrescription = async (req, res, next) => {
  try {
    const { medicines, instructions } = req.body;

    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one medicine is required' });
    }

    let prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    // Verify that the logged-in doctor is the one who issued the prescription
    if (prescription.doctor.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to modify this prescription' });
    }

    prescription.medicines = medicines;
    prescription.instructions = instructions;
    
    await prescription.save();

    res.json({
      success: true,
      message: 'Prescription updated successfully',
      data: prescription
    });
  } catch (error) {
    next(error);
  }
};
