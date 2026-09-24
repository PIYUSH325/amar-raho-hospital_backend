const Appointment = require('../models/Appointment');
const notificationService = require('../services/notificationService');
const appointmentService = require('../services/appointmentService');

// @desc    Book a new appointment
// @route   POST /api/appointments
// @access  Private
exports.bookAppointment = async (req, res, next) => {
  try {
    const { name, email, mobile, doctor, date, time, problem, notes, doctorRef } = req.body;

    if (!doctor || !date || !time) {
      return res.status(400).json({ success: false, message: 'Doctor, date, and time are required' });
    }

    const result = await appointmentService.bookAppointment({
      doctorId: doctorRef,
      doctorName: doctor,
      appointmentDate: date,
      appointmentTime: time,
      reason: problem || 'General Consultation',
      notes: notes || '',
      authenticatedUser: req.user
    });

    if (!result.success) {
      return res.status(result.requiresAuth ? 401 : 400).json({
        success: false,
        message: result.error,
        availableAlternatives: result.availableAlternatives
      });
    }

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: result.data,
      appointmentId: result.appointmentId,
      emailStatus: result.emailStatus
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/appointments/my
// @access  Private
exports.getMyAppointments = async (req, res, next) => {
  try {
    let appointments;
    if (req.user.role === 'doctor') {
      appointments = await Appointment.find({ doctorRef: req.user.id }).sort({ createdAt: -1 });
    } else {
      appointments = await Appointment.find({ user: req.user.id }).sort({ createdAt: -1 });
    }
    res.json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a user's appointment booking
// @route   PUT /api/appointments/:id/cancel
// @access  Private
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Verify ownership
    if (appointment.user.toString() !== req.user.id && appointment.doctorRef.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to cancel this appointment' });
    }

    appointment.status = 'Cancelled';
    await appointment.save();

    // Send Appointment Cancellation Email (Non-blocking)
    notificationService.sendAppointmentStatusEmail(appointment, 'Cancelled');

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};