const DietPlan = require('../models/DietPlan');
const DietCompliance = require('../models/DietCompliance');

// @desc    Create or Update Patient's 7-Day Diet Plan
// @route   POST /api/diet/plan
// @access  Private (Doctor/Admin)
exports.upsertDietPlan = async (req, res, next) => {
  try {
    const { patientId, startDate, endDate, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Patient ID is required' });
    }

    // Only doctors or admins can assign plans
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to create diet plans' });
    }

    const dietPlan = await DietPlan.findOneAndUpdate(
      { patient: patientId },
      {
        patient: patientId,
        doctor: req.user.id,
        startDate,
        endDate,
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        saturday,
        sunday,
        updatedAt: Date.now()
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Weekly diet plan saved successfully',
      data: dietPlan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Patient's 7-Day Diet Plan
// @route   GET /api/diet/plan/:patientId
// @access  Private
exports.getDietPlan = async (req, res, next) => {
  try {
    const patientId = req.params.patientId === 'me' ? req.user.id : (req.params.patientId || req.user.id);

    const dietPlan = await DietPlan.findOne({ patient: patientId });

    if (!dietPlan) {
      return res.status(200).json({ success: true, data: null, message: 'No diet plan assigned yet' });
    }

    res.status(200).json({
      success: true,
      data: dietPlan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log Daily Meal Adherence/Compliance Status
// @route   POST /api/diet/compliance
// @access  Private (Patient/Admin)
exports.logCompliance = async (req, res, next) => {
  try {
    const { date, meal, status } = req.body; // meal: 'breakfast'/'lunch'/'snacks'/'dinner', status: 'Followed'/'Skipped'/'Pending'
    const patientId = req.user.id;

    if (!date || !meal || !status) {
      return res.status(400).json({ success: false, message: 'Date, meal slot, and status are required' });
    }

    const validMeals = ['breakfast', 'lunch', 'snacks', 'dinner'];
    const validStatus = ['Followed', 'Skipped', 'Pending'];

    if (!validMeals.includes(meal) || !validStatus.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid meal slot or status value' });
    }

    // Find and update, or create daily compliance log document
    const query = { patient: patientId, date };
    const update = { $set: { [`meals.${meal}`]: status } };
    
    const compliance = await DietCompliance.findOneAndUpdate(query, update, {
      new: true,
      upsert: true
    });

    res.status(200).json({
      success: true,
      message: 'Compliance status updated successfully',
      data: compliance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Patient Compliance Logs for Date Range
// @route   GET /api/diet/compliance/:patientId
// @access  Private
exports.getComplianceLogs = async (req, res, next) => {
  try {
    const patientId = req.params.patientId === 'me' ? req.user.id : req.params.patientId;
    const { startDate, endDate } = req.query; // Expect format YYYY-MM-DD

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Patient ID is required' });
    }

    const query = { patient: patientId };
    
    // Add date range query if provided
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const logs = await DietCompliance.find(query).sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
