const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

router.use(protect);
router.get('/me', authorize('patient', 'admin'), patientController.getMe);
router.post('/upload-report', protect, authorize('patient', 'user'), upload.single('reportFile'), patientController.uploadReport);
router.post('/chat-ai', protect, patientController.chatWithAI);
router.put('/todo/toggle', authorize('patient', 'user'), patientController.toggleTodoTask);
router.post('/todo/check-missed', authorize('patient', 'user'), patientController.checkMissedTasks);

module.exports = router;
