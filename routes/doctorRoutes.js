const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', doctorController.getDoctors);

router.use(protect);
router.get('/me', authorize('doctor', 'admin'), doctorController.getMe);
router.post('/profile', authorize('doctor'), doctorController.updateProfile);
router.put('/presence', authorize('doctor'), doctorController.togglePresenceStatus);
router.get('/notifications', authorize('doctor'), doctorController.getNotifications);

module.exports = router;
