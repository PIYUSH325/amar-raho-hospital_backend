const Doctor = require('../models/Doctor');
const Notification = require('../models/Notification');

// @desc    Get all verified doctors
// @route   GET /api/doctors
// @access  Public
exports.getDoctors = async (req, res, next) => {
  try {
    const doctors = await Doctor.find({ isVerified: true }).populate('user', 'name email');
    res.json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current doctor's own profile
// @route   GET /api/doctors/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    let doctor = await Doctor.findOne({ user: req.user.id }).populate('user', 'name email');
    if (!doctor) {
      doctor = await Doctor.create({ user: req.user.id });
      doctor = await Doctor.findOne({ user: req.user.id }).populate('user', 'name email');
    }
    res.json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update doctor profile settings
// @route   POST /api/doctors/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { specialization, experience, fees, bio, availability, department } = req.body;

    const fieldsToUpdate = {
      specialization,
      experience: experience ? Number(experience) : undefined,
      fees: fees ? Number(fees) : undefined,
      bio,
      availability,
      department
    };

    let doctor = await Doctor.findOne({ user: req.user.id });

    if (doctor) {
      doctor = await Doctor.findOneAndUpdate(
        { user: req.user.id },
        { $set: fieldsToUpdate },
        { new: true, runValidators: true }
      );
      return res.json({ success: true, message: 'Profile updated successfully', data: doctor });
    }

    fieldsToUpdate.user = req.user.id;
    doctor = await Doctor.create(fieldsToUpdate);
    res.status(201).json({ success: true, message: 'Profile created successfully', data: doctor });
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ doctor: req.user.id })
      .populate('patient', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle doctor presence status (Active/Away)
// @route   PUT /api/doctors/presence
// @access  Private (Doctor)
exports.togglePresenceStatus = async (req, res, next) => {
  try {
    const { isPresenceActive } = req.body;
    const { sendDoctorUnavailabilityAlerts } = require('../services/notificationService');

    let doctor = await Doctor.findOne({ user: req.user.id });
    if (!doctor) {
      doctor = await Doctor.create({ user: req.user.id });
    }

    doctor = await Doctor.findOneAndUpdate(
      { user: req.user.id },
      { $set: { isPresenceActive } },
      { new: true }
    );

    if (!isPresenceActive) {
      sendDoctorUnavailabilityAlerts(req.user.id);
    }

    res.json({
      success: true,
      message: `Presence status updated to ${isPresenceActive ? 'Active' : 'Away'}`,
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};
