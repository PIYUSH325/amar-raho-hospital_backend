const Appointment = require('../models/Appointment');
exports.bookAppointment = async (req, res, next) => {
  try {
    const { name, email, mobile, doctor, date, time, problem, doctorRef } = req.body;

    if (!name || !email || !mobile || !doctor || !date || !time || !problem) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const appointment = await Appointment.create({
      user: req.user.id,
      doctorRef,
      name,
      email,
      mobile,
      doctor,
      date,
      time,
      problem
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/appointments/my
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

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};