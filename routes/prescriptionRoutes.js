const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.post('/', authorize('doctor'), prescriptionController.createPrescription);
router.get('/', authorize('patient', 'doctor', 'admin'), prescriptionController.getPrescriptions);
router.put('/:id', authorize('doctor'), prescriptionController.updatePrescription);

module.exports = router;
