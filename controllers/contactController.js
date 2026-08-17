const Contact = require('../models/Contact');

// @desc    Submit a contact message
// @route   POST /api/contact
// @access  Public
exports.submitContact = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const contact = await Contact.create({ name, email, subject, message });
    res.status(201).json({
      success: true,
      message: 'Contact message received!',
      data: contact
    });
  } catch (error) {
    next(error);
  }
};
