const express = require('express');
const router = express.Router();
const { getChatHistory, getIceServers } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// Register the static route BEFORE the dynamic parameter route
router.get('/token/ice-servers', protect, getIceServers);
router.get('/:partnerId', protect, getChatHistory);

module.exports = router;
