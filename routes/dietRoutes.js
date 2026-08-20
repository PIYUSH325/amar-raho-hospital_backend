const express = require('express');
const router = express.Router();
const dietController = require('../controllers/dietController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.post('/plan', dietController.upsertDietPlan);
router.get('/plan/:patientId', dietController.getDietPlan);
router.post('/compliance', dietController.logCompliance);
router.get('/compliance/:patientId', dietController.getComplianceLogs);

module.exports = router;
