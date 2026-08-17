const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecordController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.post('/', authorize('doctor'), medicalRecordController.createRecord);
router.get('/', authorize('patient', 'doctor', 'admin'), medicalRecordController.getRecords);

module.exports = router;
