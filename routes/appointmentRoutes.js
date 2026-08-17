const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.post('/', authorize('patient'), appointmentController.bookAppointment);
router.get('/my', authorize('patient', 'doctor'), appointmentController.getMyAppointments);
router.put('/:id/cancel', authorize('patient', 'doctor', 'admin'), appointmentController.cancelAppointment);

module.exports = router;