const express = require('express');
const router = express.Router();
const { getChatHistory, getIceServers, uploadChatMedia } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const chatUpload = require('../middleware/chatUpload');

// Upload media attachment (photos, videos, documents, voice notes)
router.post('/upload', protect, chatUpload.single('file'), uploadChatMedia);

// Register the static route BEFORE the dynamic parameter route
router.get('/token/ice-servers', protect, getIceServers);
router.get('/:partnerId', protect, getChatHistory);

module.exports = router;
