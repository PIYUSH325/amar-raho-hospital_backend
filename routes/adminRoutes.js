const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

// Stats (Admin only)
router.get('/stats', authorize('admin'), adminController.getStats);

// Doctors (Admin only)
router.get('/doctors', authorize('admin'), adminController.getDoctorsList);
router.post('/doctors', authorize('admin'), adminController.createDoctorAccount);
router.put('/doctors/:id/verify', authorize('admin'), adminController.verifyDoctor);

// Patients (Admin and Doctor)
router.get('/patients', authorize('admin', 'doctor'), adminController.getPatientsList);
router.put('/patients/:id', authorize('admin', 'doctor'), adminController.updatePatientProfile);

// Users (Admin only)
router.get('/users', authorize('admin'), adminController.getUsers);
router.delete('/users/:id', authorize('admin'), adminController.deleteUser);

// Appointments (Admin and Doctor)
router.get('/appointments', authorize('admin', 'doctor'), adminController.getAppointments);
router.put('/appointments/:id/status', authorize('admin', 'doctor'), adminController.updateAppointmentStatus);

// Hospitals (Admin only)
router.get('/hospitals', authorize('admin'), adminController.getHospitals);
router.post('/hospitals', authorize('admin'), adminController.createHospital);
router.delete('/hospitals/:id', authorize('admin'), adminController.deleteHospital);

// Departments (Admin only)
router.get('/departments', authorize('admin'), adminController.getDepartments);
router.post('/departments', authorize('admin'), adminController.createDepartment);
router.delete('/departments/:id', authorize('admin'), adminController.deleteDepartment);

module.exports = router;
